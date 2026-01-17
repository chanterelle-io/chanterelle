import React, { useState } from "react";
import { invokeModel } from "../../services/apis/invokeModel";
import { ModelMeta, ModelInput, ModelInputPreset, ModelInputGrouping } from "../../types/ModelMeta";
import { ModelInputs } from "../../types/ModelInputs";
import { SectionType, SectionComponent } from "../../components/insights";
import { FeedbackForm } from "../../components/FeedbackForm";
import { FeedbackList } from "../../components/FeedbackList";
import { getFeedbackHistory, FeedbackEntry } from "../../services/apis/getFeedbackHistory";
import { deleteFeedback } from "../../services/apis/deleteFeedback";
import { Bot, ChevronRight, History } from "lucide-react";
import { useParams } from "react-router";
import { ModelFormFieldset } from "../../components/form";
import { getInputDefinition } from "../../components/form/inputs";
import { resolveEffectiveConstraints } from "../../utils/formUtils";


interface ModelFormProps {
    model: ModelMeta;
}

const ModelForm: React.FC<ModelFormProps> = ({ model }) => {
    const { modelId } = useParams<{ modelId: string }>(); // actually it's project name
    const formCardRef = React.useRef<HTMLDivElement | null>(null);
    const [formCardHeight, setFormCardHeight] = useState<number | null>(null);
    const [values, setValues] = useState<ModelInputs>(
        Object.fromEntries(model.inputs.map(input => {
            const def = getInputDefinition(input.type);
            return [input.name, def ? def.getDefaultValue(input) : ""];
        }))
    );
    const [presetSelections, setPresetSelections] = useState<{ [presetName: string]: string }>({});
    const [result, setResult] = useState<SectionType[] | null>(null);
    const [predictLoading, setPredictLoading] = useState(false);
    
    // Feedback state
    const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
    const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const refreshHistory = React.useCallback(() => {
        if (model.allow_feedback && modelId) {
            setLoadingHistory(true);
            getFeedbackHistory(modelId).then(history => {
                setFeedbackHistory(history);
                setLoadingHistory(false);
            });
        }
    }, [model.allow_feedback, modelId]);

    React.useEffect(() => {
        refreshHistory();
    }, [refreshHistory]);

    const handleDeleteFeedback = async (entry: FeedbackEntry) => {
        if (!modelId) return;
        setLoadingHistory(true);
        try {
            await deleteFeedback(modelId, entry.timestamp);
            refreshHistory();
        } catch (e) {
            console.error(e);
            alert("Failed to delete feedback");
            setLoadingHistory(false);
        }
    };

    const handleSelectFeedback = (entry: FeedbackEntry) => {
        if (entry.feedback.context?.inputs) {
             setValues(entry.feedback.context.inputs);
             // Clear presets to avoid confusion, as we are loading raw values
             setPresetSelections({});
        }
        if (entry.feedback.context?.outputs) {
             setResult(entry.feedback.context.outputs);
        }
    };

    React.useEffect(() => {
        const el = formCardRef.current;
        if (!el) return;

        const update = () => setFormCardHeight(el.getBoundingClientRect().height);
        update();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(() => update());
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Groupings
    const groupings: ModelInputGrouping[] = model.input_groupings || [];



    // Map groupings to their ordered items (inputs and presets interleaved)
    const grouped = groupings.map(group => {
        const items = group.inputs.map(name => {
            const preset = (model.input_presets || []).find(p => p.input_preset === name);
            if (preset) {
                return { type: "preset" as const, item: preset };
            }
            const input = model.inputs.find(i => i.name === name);
            if (input) {
                return { type: "input" as const, item: input };
            }
            return null;
        }).filter(Boolean) as Array<{ type: "input", item: ModelInput } | { type: "preset", item: ModelInputPreset }>;
        return {
            ...group,
            items
        };
    });

    // Find ungrouped inputs and presets
    const groupedInputNames = new Set(groupings.flatMap(g => g.inputs));
    const groupedPresetNames = new Set(groupings.flatMap(g => g.inputs));
    const ungroupedInputs = model.inputs.filter(i => !groupedInputNames.has(i.name));
    const ungroupedPresets = (model.input_presets || []).filter(
        p => !groupedPresetNames.has(p.input_preset)
    );

    // Handle input change
    const handleChange = (name: string, value: any) => {
        setValues(prev => ({ ...prev, [name]: value }));
    };

    // Handle preset selection
    const handlePresetChange = (preset: ModelInputPreset, selectedName: string) => {
        setPresetSelections(prev => ({ ...prev, [preset.input_preset]: selectedName }));
        const found = preset.presets.find((p: any) => p.name === selectedName);
        if (found) {
            setValues(prev => ({
                ...prev,
                ...found.values
            }));
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPredictLoading(true);
        // Validate all required inputs
        const errors: string[] = [];
        model.inputs.forEach(input => {
            const def = getInputDefinition(input.type);
            const constraints = resolveEffectiveConstraints(input, values);
            const error = def?.validate ? def.validate(values[input.name], input, constraints) : null;
            if (error) {
                errors.push(error);
            }
        });
        if (errors.length > 0) {
            alert("Please fix the following errors:\n" + errors.join("\n"));
            setPredictLoading(false); // <-- Add this so the button is re-enabled after validation errors
            return;
        }

        // Process values before submitting (e.g. string -> number)
        const parsedValues = { ...values };
        model.inputs.forEach(input => {
            const def = getInputDefinition(input.type);
            if (def?.processValue) {
                parsedValues[input.name] = def.processValue(values[input.name], input);
            }
        });

        console.log("Submitting values:", parsedValues);
        // Ensure modelId is defined
        if (!modelId) {
            console.error("Model ID is not defined");
            setPredictLoading(false);
            return;
        }
        // Submit the form data
        invokeModel(modelId, parsedValues)
            .then(response => {
                console.log("Model invoked successfully:", response);
                setResult(response);
            })
            .catch(error => {
                console.error("Error invoking model:", error);
                // Create an error section for caught exceptions
                setResult([{
                    type: 'section',
                    id: 'error',
                    title: 'Error',
                    description: error.message || 'An error occurred while invoking the model',
                    items: []
                }]);
            })
            .finally(() => {
                setPredictLoading(false);
            });
    };

    return (
        <div className="space-y-6 min-w-0">
            <div className="flex flex-col md:flex-row gap-6 min-w-0 items-stretch">
                <div className="flex-1 min-w-0">
                    <div ref={formCardRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-md px-2 py-1 transition-colors border border-transparent dark:border-slate-700">
                        {model.allow_feedback && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowFeedbackHistory(!showFeedbackHistory)}
                                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${showFeedbackHistory ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}
                                    title={showFeedbackHistory ? "Hide feedback history" : "Show feedback history"}
                                >
                                    {showFeedbackHistory ? <ChevronRight className="w-5 h-5" /> : <History className="w-5 h-5" />}
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Grouped sections */}
                        {grouped.map(group => (
                            <ModelFormFieldset
                                key={group.grouping}
                                group={group}
                                values={values}
                                presetSelections={presetSelections}
                                handleChange={handleChange}
                                handlePresetChange={handlePresetChange}
                            />
                        ))}

                        {/* Ungrouped Presets */}
                        {ungroupedPresets.length > 0 && (
                            <ModelFormFieldset
                                group={{
                                    grouping: "other-presets",
                                    description: groupings.length > 0 ? "Other Presets" : "Presets",
                                    inputs: ungroupedPresets.map(preset => preset.input_preset),
                                    items: ungroupedPresets.map(preset => ({ type: "preset" as const, item: preset }))
                                }}
                                values={values}
                                presetSelections={presetSelections}
                                handleChange={handleChange}
                                handlePresetChange={handlePresetChange}
                            />
                        )}

                        {/* Ungrouped Inputs */}
                        {ungroupedInputs.length > 0 && (
                            <ModelFormFieldset
                                group={{
                                    grouping: "other-inputs",
                                    description: groupings.length > 0 ? "Other Inputs" : "Inputs",
                                    inputs: ungroupedInputs.map(input => input.name),
                                    items: ungroupedInputs.map(input => ({ type: "input" as const, item: input }))
                                }}
                                values={values}
                                presetSelections={presetSelections}
                                handleChange={handleChange}
                                handlePresetChange={handlePresetChange}
                            />
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400 my-2">
                            <p>Note: Required fields are marked with an asterisk (*).</p>
                            <p>Ensure all inputs are valid before submitting.</p>
                        </div>
                        {/* <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                            Predict
                        </button> */}
                        <button
                            disabled={predictLoading}
                            className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:cursor-pointer"
                        >
                            <Bot className="w-4 h-4" />
                            {predictLoading ? "Predicting..." : "Predict"}
                        </button>

                        </form>
                    </div>
                </div>

                {/* Feedback Sidebar (height matches the form card) */}
                {model.allow_feedback && showFeedbackHistory && (
                    <div className="w-full md:w-[300px] shrink-0 self-stretch">
                        <div
                            className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg flex flex-col"
                            style={formCardHeight ? { height: formCardHeight } : undefined}
                        >
                            <div className="p-2 flex justify-between items-center border-b border-gray-200 dark:border-slate-700">
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">History</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowFeedbackHistory(false)}
                                    className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                    title="Hide feedback history"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto min-h-0">
                                <FeedbackList 
                                    history={feedbackHistory} 
                                    loading={loadingHistory} 
                                    onDelete={handleDeleteFeedback}
                                    onSelect={handleSelectFeedback}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results (full width; does not contract when history is open) */}
            {result && result.length > 0 && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 overflow-x-auto min-w-0">
                    {result.map((section) => (
                        <SectionComponent
                            key={section.id}
                            section={section}
                        />
                    ))}
                    {model.allow_feedback && modelId && (
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <FeedbackForm
                                projectName={modelId}
                                context={{ inputs: values, outputs: result }}
                                onFeedbackSubmitted={() => {
                                    refreshHistory();
                                    if (!showFeedbackHistory) setShowFeedbackHistory(true);
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModelForm;