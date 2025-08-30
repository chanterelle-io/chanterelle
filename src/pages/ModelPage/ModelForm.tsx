import React, { useState } from "react";
import { invokeModel } from "../../services/apis/invokeModel";
import { ModelMeta, ModelInput, ModelInputPreset, ModelInputGrouping, ModelInputConstraint } from "../../types/ModelMeta";
import { ModelInputs } from "../../types/ModelInputs";
import { SectionType, SectionComponent } from "../../components/insights";
import { Bot } from "lucide-react";
import { useParams } from "react-router";
import { ModelFormFieldset } from "../../components/form";


interface ModelFormProps {
    model: ModelMeta;
}

const getDefaultValue = (input: ModelInput) => {
    if (input.default !== undefined) return input.default;
    if (input.type === "boolean") return false;
    if (input.type === "float" || input.type === "int") return "";
    if (input.type === "textarea") return "";
    if (input.type === "file") return null;
    return "";
};

// Helper to merge constraints (base + override)
const mergeConstraints = (base?: ModelInputConstraint, override?: ModelInputConstraint): ModelInputConstraint => {
    return { ...(base || {}), ...(override || {}) };
};

const ModelForm: React.FC<ModelFormProps> = ({ model }) => {
    const { modelId } = useParams<{ modelId: string }>(); // actually it's project name
    const [values, setValues] = useState<ModelInputs>(
        Object.fromEntries(model.inputs.map(input => [input.name, getDefaultValue(input)]))
    );
    const [presetSelections, setPresetSelections] = useState<{ [presetName: string]: string }>({});
    // const [selectedForSensitivity, setSelectedForSensitivity] = useState<string | null>(null);
    const [result, setResult] = useState<SectionType[] | null>(null);
    const [predictLoading, setPredictLoading] = useState(false);
    // // Helper: get ModelInput by name
    // const getInputByName = (name: string) => model.inputs.find(i => i.name === name);

    // // Helper: get ModelInputPreset by input_preset name
    // const getPresetByName = (name: string) => model.input_presets?.find(p => p.input_preset === name);

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

    // Get effective constraints for an input (handles depends_on)
    const getEffectiveConstraints = (input: ModelInput): ModelInputConstraint | undefined => {
        if (input.depends_on) {
            const parentValue = values[input.depends_on.input_name];
            const mapping = input.depends_on.mapping?.[parentValue];
            if (mapping && mapping.constraints) {
                return mergeConstraints(input.constraints, mapping.constraints);
            }
        }
        return input.constraints;
    };

    // Get effective constraints for a preset (handles depends_on)
    const getEffectivePresetConstraints = (preset: ModelInputPreset): ModelInputConstraint | undefined => {
        if (preset.depends_on) {
            const parentValue = values[preset.depends_on.field];
            const mapping = preset.depends_on.mapping?.[parentValue];
            if (mapping && mapping.constraints) {
                return mapping.constraints;
            }
        }
        return undefined;
    };

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
            // if (input.required && !values[input.name]) {
            //     errors.push(`Field "${input.label || input.name}" is required.`);
            // }
            if (input.required) {
                if (input.type === "file") {
                    // For file inputs, check if a file is selected
                    if (!values[input.name] || 
                        (Array.isArray(values[input.name]) && values[input.name].length === 0)) {
                        errors.push(`File "${input.label || input.name}" is required.`);
                    }
                } else if (!values[input.name] && values[input.name] !== 0 && values[input.name] !== false) {
                    errors.push(`Field "${input.label || input.name}" is required.`);
                }
            }
            const constraints = getEffectiveConstraints(input);
            if (constraints?.regex && values[input.name] && !new RegExp(constraints.regex).test(values[input.name])) {
                errors.push(`Field "${input.label || input.name}" does not match the required pattern.`);
            }
        });
        if (errors.length > 0) {
            alert("Please fix the following errors:\n" + errors.join("\n"));
            setPredictLoading(false); // <-- Add this so the button is re-enabled after validation errors
            return;
        }

        // Convert int/float values to numbers before submitting
        const parsedValues = { ...values };
        model.inputs.forEach(input => {
            if ((input.type === "int" || input.type === "float") && values[input.name] !== "") {
                const num = input.type === "int"
                    ? parseInt(values[input.name], 10)
                    : parseFloat(values[input.name]);
                parsedValues[input.name] = isNaN(num) ? values[input.name] : num;
            }
            // Handle file inputs
            if (input.type === "file" && values[input.name]) {
                const fileValue = values[input.name];
                if (Array.isArray(fileValue)) {
                    // Multiple files - each has { path, name }
                    parsedValues[input.name] = fileValue.map((file: any) => ({
                        name: file.name,
                        path: file.path
                    }));
                } else if (fileValue && typeof fileValue === 'object') {
                    // Single file - has { path, name }
                    parsedValues[input.name] = {
                        name: fileValue.name,
                        path: fileValue.path
                    };
                }
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Grouped sections */}
                {grouped.map(group => (
                    <ModelFormFieldset
                        key={group.grouping}
                        group={group}
                        values={values}
                        presetSelections={presetSelections}
                        getEffectiveConstraints={getEffectiveConstraints}
                        getEffectivePresetConstraints={getEffectivePresetConstraints}
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
                        getEffectiveConstraints={getEffectiveConstraints}
                        getEffectivePresetConstraints={getEffectivePresetConstraints}
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
                        getEffectiveConstraints={getEffectiveConstraints}
                        getEffectivePresetConstraints={getEffectivePresetConstraints}
                        handleChange={handleChange}
                        handlePresetChange={handlePresetChange}
                    />
                )}
                <div className="text-xs text-gray-500 mt-2">
                    <p>Note: Required fields are marked with an asterisk (*).</p>
                    <p>Ensure all inputs are valid before submitting.</p>
                </div>
                {/* <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                    Predict
                </button> */}
                <button
                    disabled={predictLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:cursor-pointer"
                >
                    <Bot className="w-4 h-4" />
                    {predictLoading ? "Predicting..." : "Predict"}
                </button>

            </form>
            {result && result.length > 0 && (
                <div className="mt-6 p-4 rounded-lg">
                    {result.map((section) => (
                        <SectionComponent 
                            key={section.id} 
                            section={section} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModelForm;