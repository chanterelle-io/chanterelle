import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { invokeInteractive, InteractiveOutput } from "../../services/apis/invokeInteractive";
import { ModelInput } from "../../types/ModelMeta";
import { ModelInputs } from "../../types/ModelInputs";
import { ProjectMeta } from "../../types/Project";
import { SectionComponent as Section } from "../../components/insights";
import ModelInputField from "../../components/form/ModelInputField";
import { getInputDefinition } from "../../components/form/inputs";
import { Send, RefreshCw, AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { warmModel } from "../../services/apis/warmModel";
import { resolveEffectiveConstraints } from "../../utils/formUtils";
// import { getModelMeta } from "../../services/apis/getModelMeta";
// We reuse ModelMeta type for interactive definition if compatible?
// Yes, we will just use it to type the project info we fetched.

interface InteractivePageProps {
    project?: ProjectMeta;
}

const InteractivePage: React.FC<InteractivePageProps> = () => {
    const { modelId } = useParams<{ modelId: string }>(); // project_name
    const navigate = useNavigate();
    const [projectTitle] = useState(modelId || "Interactive Agent");

    const [isMac] = useState(() => navigator.userAgent.includes('Mac'));
    
    // Conversation State
    const [history, setHistory] = useState<Array<{ type: 'user' | 'agent', content: any }>>([]);
    const [currentFormInputs, setCurrentFormInputs] = useState<ModelInput[] | null>(null);
    const [inputValues, setInputValues] = useState<ModelInputs>({});
    
    // UI State
    const [processing, setProcessing] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const unlistenFnRef = useRef<Function | null>(null);

    // Initial Load
    useEffect(() => {
        if (!modelId) return;

        const init = async () => {
             setInitializing(true);
             try {
                // In dev, React.StrictMode intentionally mounts/unmounts/remounts components,
                // which can trigger this init sequence twice. Use a short time-window guard
                // to avoid double-initializing on the same navigation.
                const initGuardKey = `interactive:init:${modelId}`;
                const now = Date.now();
                const lastInit = Number(sessionStorage.getItem(initGuardKey) || 0);
                if (lastInit && now - lastInit < 2000) {
                    return;
                }
                sessionStorage.setItem(initGuardKey, String(now));

                // 1. Warm up the model (start python process)
                const warmRes = await warmModel(modelId);
                if (!warmRes.warmup) {
                    throw new Error(warmRes.error || "Failed to start agent process");
                }

                // 2. Start Session automatically
                // Let's trigger an empty "initialize" call.
                await startTurn({});
             } catch (e: any) {
                 setError(e.message || "Initialization failed");
             } finally {
                 setInitializing(false);
             }
        };

        init();

        return () => {
            if (unlistenFnRef.current) unlistenFnRef.current();
        };
    }, [modelId]);

    // Scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, currentFormInputs]);

    const handleOutput = (data: InteractiveOutput) => {
        if (data.error) {
            setError(data.error);
            setProcessing(false);
            return;
        }

        if (data.outputs && data.outputs.length > 0) {
            setHistory(prev => [...prev, { type: 'agent', content: data.outputs }]);
        }

        if (data.next_inputs) {
            setCurrentFormInputs(data.next_inputs);
            // Initialize default values for the new form
            const defaults: ModelInputs = {};
            data.next_inputs.forEach(input => {
                const def = getInputDefinition(input.type);
                defaults[input.name] = def ? def.getDefaultValue(input) : "";
            });
            setInputValues(defaults);
            setProcessing(false); // Turn is ready for user input
        }
        
        // Use 'status' or metadata to determine if done, but 'next_inputs' is the strongest signal for "your turn"
    };

    const formatUserBubbleText = (inputs: ModelInputs): string => {
        if (!inputs || typeof inputs !== "object") {
            return String(inputs);
        }

        // Common UX: show the message field like a normal chat.
        const msg = inputs["message"];
        if (typeof msg === "string" && msg.trim().length > 0) {
            return msg;
        }

        // If it's a single field (e.g., username), show just its value.
        const entries = Object.entries(inputs).filter(([, v]) => v !== undefined && v !== null && v !== "");
        if (entries.length === 1) {
            const [key, value] = entries[0];
            return `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`;
        }

        // Fallback: key/value list
        return entries
            .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
            .join("\n");
    };

    const startTurn = async (inputs: ModelInputs) => {
        if (!modelId) return;
        setProcessing(true);
        setError(null);
        setCurrentFormInputs(null); // Hide form while thinking

        // Add user move to history (unless it's the invisible init)
        if (Object.keys(inputs).length > 0) {
            // Visualize user inputs? Maybe just JSON or a summary text for now.
             setHistory(prev => [...prev, { type: 'user', content: inputs }]);
        }

        if (unlistenFnRef.current) unlistenFnRef.current();

        try {
            const unlisten = await invokeInteractive(modelId, inputs, handleOutput);
            unlistenFnRef.current = unlisten;
        } catch (e: any) {
            setError(e.toString());
            setProcessing(false);
        }
    };

    const restartSession = async () => {
        if (!modelId) return;

        // Stop any active event listener ASAP
        if (unlistenFnRef.current) {
            try {
                unlistenFnRef.current();
            } finally {
                unlistenFnRef.current = null;
            }
        }

        // Clear the StrictMode init guard so restart always works
        try {
            sessionStorage.removeItem(`interactive:init:${modelId}`);
        } catch {
            // ignore
        }

        // Reset UI state
        setError(null);
        setHistory([]);
        setCurrentFormInputs(null);
        setInputValues({});
        setProcessing(false);

        setInitializing(true);
        try {
            const warmRes = await warmModel(modelId);
            if (!warmRes.warmup) {
                throw new Error(warmRes.error || "Failed to start agent process");
            }

            await startTurn({});
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setInitializing(false);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        startTurn(inputValues);
    };

    // Form Handlers
    const handleInputChange = (name: string, value: any) => {
        setInputValues(prev => ({ ...prev, [name]: value }));
    };

    // Helper to group inputs (reuse existing components if possible, or simple list)
    // For now, flat list inside a fragment
    
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
            <div
                className={`sticky ${isMac ? 'top-0 z-50' : 'top-8 z-30'} px-6 py-2 bg-gray-50 dark:bg-slate-900/90 backdrop-blur mb-2 flex items-center justify-between`}
                data-tauri-drag-region={isMac ? "true" : undefined}
            >
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title="Back to catalog"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>

                <h2 className="text-lg font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {projectTitle}
                </h2>

                <div className="flex items-center">
                    <button
                        onClick={restartSession}
                        disabled={initializing || processing}
                        className="mr-4 px-2 border border-blue-600 flex items-center text-blue-600 hover:text-blue-400 dark:hover:text-blue-500 hover:cursor-pointer disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Restart Session"
                    >
                        <RotateCcw className={`mr-1 ${initializing || processing ? 'animate-spin' : ''}`} size={16} /> Restart
                    </button>
                </div>
            </div>
            
            <main className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto w-full px-4 py-6 pb-48">

                {initializing && (
                    <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 px-4 py-3 flex items-center gap-2">
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Starting process…</span>
                    </div>
                )}

                {/* History */}
                <div className="space-y-6">
                    {history.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`${msg.type === 'user' ? 'max-w-[85%]' : 'w-full max-w-3xl min-w-0'} ${
                                msg.type === 'user' 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 rounded-xl p-4 shadow-sm border border-blue-200 dark:border-blue-900/40' 
                                    : '' // Agent
                            }`}>
                                {msg.type === 'user' ? (
                                    <div className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">
                                        {formatUserBubbleText(msg.content)}
                                    </div>
                                ) : (
                                    // Agent Output
                                    <div className="space-y-4 min-w-0">
                                        {Array.isArray(msg.content) && msg.content.map((section: any, sIdx: number) => (
                                            <Section key={sIdx} section={section} index={sIdx} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {error && (
                        <div className="p-4 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-2">
                             <AlertCircle size={20} />
                             <span>{error}</span>
                        </div>
                    )}

                    {processing && !currentFormInputs && (
                        <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                            <RefreshCw className="animate-spin" size={16} />
                            <span>Thinking...</span>
                        </div>
                    )}
                    
                    <div ref={bottomRef} />
                </div>

                </div>
            </main>

            {/* Input Area (sticky, always visible) */}
            <div className="sticky bottom-0 z-40 border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur">
                <div className="max-w-5xl mx-auto px-4 py-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
                    {currentFormInputs ? (
                        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Your turn</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Fill the fields and submit</div>
                            </div>

                            <div className="space-y-4">
                                {currentFormInputs.map((input) => {
                                    const effectiveConstraints = resolveEffectiveConstraints(input, inputValues);
                                    const mergedConstraints =
                                        input.type === "textarea"
                                            ? { ...effectiveConstraints, rows: effectiveConstraints?.rows ?? 6 }
                                            : effectiveConstraints;

                                    return (
                                        <div key={input.name} className="w-full">
                                            <ModelInputField
                                                input={input}
                                                value={inputValues[input.name]}
                                                constraints={mergedConstraints}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 flex items-center justify-end">
                                <button
                                    type="submit"
                                    disabled={processing || initializing}
                                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={16} />
                                    Submit
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between gap-4">
                            <span>{processing ? "Waiting for agent…" : "Session ready. Waiting for the next prompt…"}</span>
                            <button
                                type="button"
                                onClick={restartSession}
                                disabled={initializing || processing}
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title="Restart Session"
                            >
                                <RotateCcw className={`${initializing || processing ? 'animate-spin' : ''}`} size={16} />
                                Restart
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Footer disabled until implemented */}
            {/* <Footer /> */}
        </div>
    );
};

export default InteractivePage;
