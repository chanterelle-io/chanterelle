import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { invokeInteractive, InteractiveOutput } from "../../services/apis/invokeInteractive";
import { ModelInput } from "../../types/ModelMeta";
import { ModelInputs } from "../../types/ModelInputs";
import { ProjectMeta } from "../../types/Project";
import { SectionComponent as Section } from "../../components/insights";
import ModelInputField from "../../components/form/ModelInputField";
import { getInputDefinition } from "../../components/form/inputs";
import { Send, RefreshCw, AlertCircle, ArrowLeft, RotateCcw, History, ChevronRight } from "lucide-react";
import { warmModel } from "../../services/apis/warmModel";
import { resolveEffectiveConstraints } from "../../utils/formUtils";
import { forceKillPython } from "../../services/apis/forceKillPython";
import { stopInteractive } from "../../services/apis/stopInteractive";
import { FeedbackForm } from "../../components/FeedbackForm";
import { FeedbackList } from "../../components/FeedbackList";
import { getFeedbackHistory, FeedbackEntry } from "../../services/apis/getFeedbackHistory";
import { deleteFeedback } from "../../services/apis/deleteFeedback";
import { updateFeedback } from "../../services/apis/updateFeedback";
// import { getModelMeta } from "../../services/apis/getModelMeta";
// We reuse ModelMeta type for interactive definition if compatible?
// Yes, we will just use it to type the project info we fetched.

interface InteractivePageProps {
    project?: ProjectMeta;
}

type ConversationTurn = {
    id: string;
    type: "user" | "agent";
    content: any;
    createdAt: number;
    responseId?: string;
    completedAt?: number;
};

type UserDisplay =
    | { kind: "text"; text: string }
    | { kind: "fields"; fields: Array<{ label: string; value: string }> };

const InteractivePage: React.FC<InteractivePageProps> = () => {
    const { modelId } = useParams<{ modelId: string }>(); // project_name
    const navigate = useNavigate();
    const [projectTitle] = useState(modelId || "Interactive Agent");

    const [isMac] = useState(() => navigator.userAgent.includes('Mac'));
    
    // Conversation State
    const [history, setHistory] = useState<ConversationTurn[]>([]);
    const [currentFormInputs, setCurrentFormInputs] = useState<ModelInput[] | null>(null);
    const [inputValues, setInputValues] = useState<ModelInputs>({});
    
    // UI State
    const [processing, setProcessing] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [wasStopped, setWasStopped] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [composerDockHeight, setComposerDockHeight] = useState(220);
    const unlistenFnRef = useRef<Function | null>(null);
    const currentRequestIdRef = useRef<string | null>(null);
    const feedbackRestoreRequestRef = useRef<string | null>(null);
    const historyContainerRef = useRef<HTMLElement>(null);
    const historyContentRef = useRef<HTMLDivElement>(null);
    const historyEndRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
    const composerDockRef = useRef<HTMLDivElement>(null);

    // Feedback State
    const [allowFeedback, setAllowFeedback] = useState(false);
    const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
    const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const activeFeedbackTimestampRef = useRef<number | null>(null);

    const refreshFeedbackHistory = useCallback(() => {
        if (allowFeedback && modelId) {
            setLoadingHistory(true);
            getFeedbackHistory(modelId).then(h => {
                setFeedbackHistory(h);
                setLoadingHistory(false);
            });
        }
    }, [allowFeedback, modelId]);

    useEffect(() => {
        refreshFeedbackHistory();
    }, [refreshFeedbackHistory]);

    const [highlightedTurnId, setHighlightedTurnId] = useState<string | null>(null);

    const handleDeleteFeedback = async (entry: FeedbackEntry) => {
        if (!modelId) return;
        setLoadingHistory(true);
        try {
            await deleteFeedback(modelId, entry.timestamp);
            refreshFeedbackHistory();
        } catch (e) {
            console.error(e);
            alert("Failed to delete feedback");
            setLoadingHistory(false);
        }
    };

    const handleSelectFeedback = (entry: FeedbackEntry) => {
        const ctx = entry.feedback?.context;
        if (!ctx || !modelId) return;

        // Prefer restoring the full saved session snapshot when available.
        // Older feedback entries may only contain a single inputs/outputs pair.
        const turns: ConversationTurn[] = Array.isArray(ctx.sessionTurns) && ctx.sessionTurns.length > 0
            ? ctx.sessionTurns
                .filter((turn: any) => turn && (turn.type === "user" || turn.type === "agent"))
                .map((turn: any) => ({
                    ...buildTurn(turn.type, turn.content, turn.responseId, turn.completedAt),
                    createdAt: typeof turn.createdAt === "number" ? turn.createdAt : Date.now(),
                }))
            : (() => {
                const fallbackTurns: ConversationTurn[] = [];
                if (ctx.inputs) {
                    fallbackTurns.push(buildTurn("user", ctx.inputs));
                }
                if (ctx.outputs) {
                    fallbackTurns.push(buildTurn("agent", ctx.outputs, undefined, Date.now()));
                }
                return fallbackTurns;
            })();

        if (turns.length === 0) return;

        const focusTurn = [...turns].reverse().find((t) => t.type === "agent") || turns[turns.length - 1];

        // Track which feedback entry is active so new turns get saved back to it
        activeFeedbackTimestampRef.current = entry.timestamp;

        stickToBottomRef.current = true;
        setHistory(turns);
        setError(null);

        // Re-initialize the Python handler with conversation history
        // so the backend rebuilds its state from the feedback turns.
        setProcessing(true);
        setCurrentFormInputs(null);
        if (unlistenFnRef.current) unlistenFnRef.current();

        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        currentRequestIdRef.current = requestId;
        feedbackRestoreRequestRef.current = requestId;

        // Pass the raw session turns so the base handler can extract conversation_history
        const rawTurns = Array.isArray(ctx.sessionTurns) ? ctx.sessionTurns : turns;
        invokeInteractive(modelId, {}, handleOutput, requestId, rawTurns)
            .then((unlisten) => { unlistenFnRef.current = unlisten; })
            .catch((e: any) => {
                setError(e.toString());
                setProcessing(false);
            });

        // Highlight the restored turn after render
        requestAnimationFrame(() => {
            setHighlightedTurnId(focusTurn.id);
            const el = document.getElementById(`turn-${focusTurn.id}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            setTimeout(() => setHighlightedTurnId(null), 2000);
        });
    };

    const buildTurn = (type: "user" | "agent", content: any, responseId?: string, completedAt?: number): ConversationTurn => ({
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        content,
        createdAt: Date.now(),
        responseId,
        completedAt,
    });

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
                if (warmRes.allow_feedback) {
                    setAllowFeedback(true);
                }
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
            currentRequestIdRef.current = null;
            void forceKillPython();
        };
    }, [modelId]);

    const isNearBottom = (): boolean => {
        const container = historyContainerRef.current;
        if (!container) return true;
        const distance = container.scrollHeight - (container.scrollTop + container.clientHeight);
        return distance < 80;
    };

    const scrollHistoryToBottom = (mode: "instant" | "slow" = "slow") => {
        const behavior: ScrollBehavior = mode === "instant" ? "auto" : "smooth";
        historyEndRef.current?.scrollIntoView({ behavior, block: "end" });
    };

    // Scroll to bottom
    useEffect(() => {
        if (stickToBottomRef.current) {
            scrollHistoryToBottom("slow");
        }
    }, [history.length, currentFormInputs, processing, error]);

    useEffect(() => {
        const container = historyContainerRef.current;
        if (!container) return;

        const onScroll = () => {
            stickToBottomRef.current = isNearBottom();
        };

        container.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            container.removeEventListener("scroll", onScroll);
        };
    }, []);

    useEffect(() => {
        const content = historyContentRef.current;
        if (!content || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(() => {
            // Keep auto-pinning only while the assistant is actively producing output.
            // Otherwise, user-driven layout changes (e.g. expanding/collapsing items)
            // should not force-scroll to the bottom.
            if (stickToBottomRef.current && (processing || initializing || stopping)) {
                scrollHistoryToBottom("instant");
            }
        });

        observer.observe(content);
        return () => observer.disconnect();
    }, [processing, initializing, stopping]);

    // Auto-save conversation back to the active feedback entry when a turn completes
    useEffect(() => {
        const ts = activeFeedbackTimestampRef.current;
        if (!ts || !modelId || processing || history.length === 0) return;
        // Only save when the last agent turn is completed
        const lastAgent = [...history].reverse().find((t) => t.type === "agent");
        if (!lastAgent?.completedAt) return;

        const context = {
            sessionTurns: history,
            inputs: (() => {
                const userTurns = history.filter((t: ConversationTurn) => t.type === "user");
                return userTurns.length > 0 ? userTurns[userTurns.length - 1].content : undefined;
            })(),
            outputs: lastAgent.content,
        };
        updateFeedback(modelId, ts, context).then(() => {
            refreshFeedbackHistory();
        }).catch((e) => {
            console.error("Failed to auto-save feedback:", e);
        });
    }, [history, processing, modelId]);

    const handleOutput = (data: InteractiveOutput) => {
        if (data.request_id && currentRequestIdRef.current && data.request_id !== currentRequestIdRef.current) {
            return;
        }

        // Feedback restore re-initialize: skip adding outputs to history,
        // only pick up next_inputs so the user can continue the conversation.
        if (feedbackRestoreRequestRef.current && data.request_id === feedbackRestoreRequestRef.current) {
            feedbackRestoreRequestRef.current = null;
            if (data.next_inputs) {
                setCurrentFormInputs(data.next_inputs);
                const defaults: ModelInputs = {};
                data.next_inputs.forEach(input => {
                    const def = getInputDefinition(input.type);
                    defaults[input.name] = def ? def.getDefaultValue(input) : "";
                });
                setInputValues(defaults);
            }
            setProcessing(false);
            setStopping(false);
            return;
        }

        if (data.stopped) {
            setProcessing(false);
            setStopping(false);
            setCurrentFormInputs(null);
            setWasStopped(true);
            return;
        }

        if (data.error) {
            setError(data.error);
            setProcessing(false);
            setStopping(false);
            return;
        }

        const outputSections = data.outputs;
        const assistantDone =
            data.event_type === "final" ||
            data.event_type === "prompt" ||
            data.done === true ||
            !!data.next_inputs;

        if (outputSections && outputSections.length > 0) {
            const responseId = data.response_id;
            const shouldAppend = data.append !== false;

            setHistory((prev) => {
                if (!responseId) {
                    return [...prev, buildTurn("agent", outputSections, undefined, assistantDone ? Date.now() : undefined)];
                }

                const existingIndex = prev.findIndex(
                    (turn) => turn.type === "agent" && turn.responseId === responseId,
                );

                if (existingIndex === -1) {
                    return [...prev, buildTurn("agent", outputSections, responseId, assistantDone ? Date.now() : undefined)];
                }

                const next = [...prev];
                const existing = next[existingIndex];
                const existingSections = Array.isArray(existing.content) ? existing.content : [];
                next[existingIndex] = {
                    ...existing,
                    content: shouldAppend ? [...existingSections, ...outputSections] : outputSections,
                    completedAt: assistantDone ? Date.now() : existing.completedAt,
                };
                return next;
            });
        } else if (assistantDone && data.response_id) {
            setHistory((prev) => {
                const existingIndex = prev.findIndex(
                    (turn) => turn.type === "agent" && turn.responseId === data.response_id,
                );
                if (existingIndex === -1) return prev;
                const next = [...prev];
                next[existingIndex] = {
                    ...next[existingIndex],
                    completedAt: Date.now(),
                };
                return next;
            });
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
            setStopping(false);
        }
        
        // Use 'status' or metadata to determine if done, but 'next_inputs' is the strongest signal for "your turn"
    };

    const looksLikePrimaryMessageField = (name: string): boolean =>
        ["message", "prompt", "query", "input"].includes(name.toLowerCase());

    const formatUserFieldValue = (value: any): string => {
        if (value === undefined || value === null) return "";
        if (typeof value === "string") return value;
        if (typeof value === "number") return String(value);
        if (typeof value === "boolean") return value ? "Yes" : "No";

        if (Array.isArray(value)) {
            if (value.length === 0) return "";
            if (value.every((item) => item && typeof item === "object" && typeof item.name === "string")) {
                return value.map((item) => item.name).join(", ");
            }
            return value.map((item) => formatUserFieldValue(item)).filter(Boolean).join(", ");
        }

        if (typeof value === "object") {
            if (typeof value.name === "string" && value.name.length > 0) {
                return value.name;
            }
            return "Provided";
        }

        return String(value);
    };

    const resolveInputKey = (input: ModelInput): string => {
        const fromName = input.name?.trim();
        if (fromName) return fromName;
        const fromLabel = (input.label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        return fromLabel || "choice";
    };

    const buildUserDisplay = (inputs: ModelInputs, formInputs: ModelInput[] | null): UserDisplay => {
        if (!inputs || typeof inputs !== "object") {
            return { kind: "text", text: String(inputs) };
        }

        const hasSchema = Array.isArray(formInputs) && formInputs.length > 0;
        const fields = hasSchema
            ? formInputs
                .map((input) => {
                    const key = resolveInputKey(input);
                    const raw = inputs[input.name] ?? inputs[key];
                    const value = formatUserFieldValue(raw);
                    return value ? { label: input.label || input.name || key, value, name: key } : null;
                })
                .filter((item): item is { label: string; value: string; name: string } => !!item)
            : Object.entries(inputs)
                .map(([name, raw]) => {
                    const value = formatUserFieldValue(raw);
                    return value ? { label: name, value, name } : null;
                })
                .filter((item): item is { label: string; value: string; name: string } => !!item);

        if (fields.length === 0) {
            return { kind: "text", text: "" };
        }

        if (fields.length === 1 && looksLikePrimaryMessageField(fields[0].name)) {
            return { kind: "text", text: fields[0].value };
        }

        return {
            kind: "fields",
            fields: fields.map(({ label, value }) => ({ label, value })),
        };
    };

    const startTurn = async (inputs: ModelInputs) => {
        if (!modelId) return;
        setProcessing(true);
        setStopping(false);
        setWasStopped(false);
        setError(null);
        setCurrentFormInputs(null); // Hide form while thinking
        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        currentRequestIdRef.current = requestId;

        // Add user move to history (unless it's the invisible init)
        if (Object.keys(inputs).length > 0) {
            // Visualize user inputs? Maybe just JSON or a summary text for now.
            stickToBottomRef.current = true;
            setHistory(prev => [...prev, buildTurn("user", buildUserDisplay(inputs, currentFormInputs))]);
            requestAnimationFrame(() => scrollHistoryToBottom("slow"));
        }

        if (unlistenFnRef.current) unlistenFnRef.current();

        try {
            const unlisten = await invokeInteractive(modelId, inputs, handleOutput, requestId);
            unlistenFnRef.current = unlisten;
        } catch (e: any) {
            setError(e.toString());
            setProcessing(false);
            setStopping(false);
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
        setWasStopped(false);
        currentRequestIdRef.current = null;
        activeFeedbackTimestampRef.current = null;
        stickToBottomRef.current = true;
        requestAnimationFrame(() => scrollHistoryToBottom("instant"));

        setInitializing(true);
        try {
            await forceKillPython();
            const warmRes = await warmModel(modelId);
            if (warmRes.allow_feedback) {
                setAllowFeedback(true);
            }
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

    const handleBackToCatalog = async () => {
        if (unlistenFnRef.current) {
            try {
                unlistenFnRef.current();
            } finally {
                unlistenFnRef.current = null;
            }
        }
        currentRequestIdRef.current = null;
        await forceKillPython();
        navigate('/');
    };

    const handleStopExecution = async () => {
        if (!processing || stopping) return;
        setStopping(true);

        const requestId = currentRequestIdRef.current || undefined;
        const softStopped = await Promise.race<boolean>([
            stopInteractive(requestId),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 800)),
        ]);

        if (!softStopped) {
            await forceKillPython();
        }

        if (unlistenFnRef.current) {
            try {
                unlistenFnRef.current();
            } finally {
                unlistenFnRef.current = null;
            }
        }
        currentRequestIdRef.current = null;
        setProcessing(false);
        setStopping(false);
        setCurrentFormInputs(null);
        setError(null);
        setWasStopped(true);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!canSubmitCurrentInputs) return;
        startTurn(inputValues);
    };

    // Form Handlers
    const handleInputChange = (name: string, value: any) => {
        setInputValues(prev => ({ ...prev, [name]: value }));
    };

    const primaryTextInput = currentFormInputs?.find((input) =>
        (input.type === "string" || input.type === "textarea") &&
        ["message", "prompt", "query", "input"].includes((input.name || "").toLowerCase()),
    ) ?? null;
    const quickChoiceInput = currentFormInputs?.length === 1 &&
        (currentFormInputs[0].type === "button" || currentFormInputs[0].type === "yes_no")
        ? currentFormInputs[0]
        : null;
    const isSimpleComposer = !!currentFormInputs && currentFormInputs.length === 1 && !!primaryTextInput;
    const isQuickChoiceComposer = !!quickChoiceInput;
    const messageValue = primaryTextInput ? (inputValues[primaryTextInput.name] as string) ?? "" : "";
    const hasContentForSimpleComposer = messageValue.trim().length > 0;

    const quickChoiceOptions = (() => {
        if (!quickChoiceInput) return [];
        if (quickChoiceInput.type === "yes_no") {
            return [
                {
                    label: quickChoiceInput.constraints?.yes_label || "Yes",
                    value: quickChoiceInput.constraints?.yes_value !== undefined ? quickChoiceInput.constraints.yes_value : true,
                },
                {
                    label: quickChoiceInput.constraints?.no_label || "No",
                    value: quickChoiceInput.constraints?.no_value !== undefined ? quickChoiceInput.constraints.no_value : false,
                },
            ];
        }

        const options = quickChoiceInput.constraints?.options;
        if (!Array.isArray(options) || options.length === 0) {
            return [{ label: "Continue", value: true }];
        }
        if (typeof options[0] === "string") {
            return (options as string[]).map((opt) => ({ label: opt, value: opt }));
        }
        return (options as Array<{ value: string; label?: string }>).map((opt) => ({
            label: opt.label || opt.value || "Option",
            value: opt.value,
        }));
    })();

    const handleQuickChoiceSubmit = (value: any) => {
        if (!quickChoiceInput || processing || initializing) return;
        const inputKey = resolveInputKey(quickChoiceInput);
        startTurn({ [inputKey]: value });
    };

    const canSubmitCurrentInputs = !!currentFormInputs && currentFormInputs.every((input) => {
        if (!input.required) return true;
        const value = inputValues[input.name];
        if (typeof value === "string") return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== "";
    });

    const formatTurnTime = (timestamp: number): string =>
        new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (!isSimpleComposer) return;
        if (e.key !== "Enter" || e.shiftKey) return;
        const target = e.target as HTMLElement;
        const isTextArea = target.tagName === "TEXTAREA";
        if (!isTextArea) return;
        if (!hasContentForSimpleComposer || processing || initializing) return;
        e.preventDefault();
        handleSubmit();
    };

    const resizeComposerTextarea = () => {
        const el = composerTextareaRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
        el.style.overflowY = el.scrollHeight > 360 ? "auto" : "hidden";
    };

    useEffect(() => {
        if (!isSimpleComposer) return;
        resizeComposerTextarea();
    }, [isSimpleComposer, messageValue]);

    useEffect(() => {
        const dock = composerDockRef.current;
        if (!dock) return;

        const updateHeight = () => {
            setComposerDockHeight(Math.max(dock.offsetHeight + 20, 220));
        };

        updateHeight();

        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(() => updateHeight());
            observer.observe(dock);
            return () => observer.disconnect();
        }

        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, [currentFormInputs, isSimpleComposer, isQuickChoiceComposer]);

    // Helper to group inputs (reuse existing components if possible, or simple list)
    // For now, flat list inside a fragment
    const controlButtonClass = "inline-flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border transition-all disabled:text-gray-400 disabled:cursor-not-allowed";
    const restartButtonClass = `${controlButtonClass} text-blue-600 hover:text-blue-400 dark:hover:text-blue-500 border-gray-200 dark:border-slate-600`;
    const stopButtonClass = `${controlButtonClass} text-red-600 hover:text-red-500 dark:hover:text-red-400 border-gray-200 dark:border-slate-600`;
    
    return (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
            <div
                className={`sticky ${isMac ? 'top-0 z-50' : 'top-8 z-30'} px-6 py-2 bg-gray-50 dark:bg-slate-900/90 backdrop-blur mb-2 flex items-center justify-between`}
                data-tauri-drag-region={isMac ? "true" : undefined}
            >
                <button
                    onClick={handleBackToCatalog}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title="Back to catalog"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>

                <h2 className="text-lg font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {projectTitle}
                </h2>

                <div className="flex items-center">
                    {processing && (
                        <button
                            onClick={handleStopExecution}
                            disabled={initializing || stopping}
                            className={`${stopButtonClass} mr-2`}
                            title="Stop Execution"
                        >
                            {stopping ? "Stopping..." : "Stop"}
                        </button>
                    )}
                    <button
                        onClick={restartSession}
                        disabled={initializing || processing}
                        className={`${restartButtonClass} mr-4`}
                        title="Restart Session"
                    >
                        <RotateCcw className={initializing || processing ? 'animate-spin' : ''} size={16} /> Restart
                    </button>
                    {allowFeedback && (
                        <button
                            type="button"
                            onClick={() => setShowFeedbackHistory(!showFeedbackHistory)}
                            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${showFeedbackHistory ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}
                            title={showFeedbackHistory ? "Hide feedback history" : "Show feedback history"}
                        >
                            {showFeedbackHistory ? <ChevronRight className="w-5 h-5" /> : <History className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex-1 min-h-0 flex overflow-hidden">
            <main ref={historyContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div
                    ref={historyContentRef}
                    className="max-w-4xl mx-auto w-full px-4 py-6"
                    style={{ paddingBottom: `${composerDockHeight + 24}px` }}
                >

                {initializing && (
                    <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 px-4 py-3 flex items-center gap-2">
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Starting process…</span>
                    </div>
                )}

                {/* History */}
                {!initializing && history.length === 0 && !error && (
                    <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Start a conversation</h3>
                        <p className="mt-2 text-slate-600 dark:text-slate-300">
                            Ask for analysis and get rich outputs like plots directly in the thread.
                        </p>
                    </div>
                )}

                <div className="space-y-6">
                    {history.map((msg, idx) => (
                        <div key={msg.id || idx} id={`turn-${msg.id}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} transition-colors duration-700 rounded-lg ${highlightedTurnId === msg.id ? 'bg-blue-100/60 dark:bg-blue-900/30' : ''}`}>
                            <div className={`${msg.type === 'user' ? 'max-w-[85%]' : 'w-full max-w-4xl min-w-0'} ${
                                msg.type === 'user' 
                                    ? 'rounded-[12px] px-4 py-3 shadow-sm ring-1 ring-slate-300/90 dark:ring-slate-500/80 bg-slate-100 dark:bg-slate-700/80' 
                                    : ''
                            }`}>
                                {msg.type === "user" && (
                                    <div className="mb-2 flex items-center justify-end">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatTurnTime(msg.createdAt)}</div>
                                    </div>
                                )}
                                {msg.type === 'user' ? (
                                    <div className="text-sm text-slate-900 dark:text-slate-100">
                                        {msg.content?.kind === "fields" ? (
                                            <div className="space-y-1.5">
                                                {msg.content.fields.map((field: { label: string; value: string }, fieldIdx: number) => (
                                                    <div key={`${field.label}-${fieldIdx}`} className="flex items-start gap-2">
                                                        <span className="text-slate-500 dark:text-slate-400">{field.label}:</span>
                                                        <span className="whitespace-pre-wrap">{field.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{msg.content?.text ?? ""}</div>
                                        )}
                                    </div>
                                ) : (
                                    // Agent Output
                                    <div className="space-y-4 min-w-0">
                                        {Array.isArray(msg.content) && msg.content.map((section: any, sIdx: number) => (
                                            <Section key={sIdx} section={section} index={sIdx} />
                                        ))}
                                    </div>
                                )}
                                {msg.type === "agent" && msg.completedAt && (
                                    <div className="mt-2 flex items-center justify-start">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {formatTurnTime(msg.completedAt)}
                                        </div>
                                    </div>
                                )}
                                {/* Show feedback on the last completed agent turn */}
                                {allowFeedback && modelId && msg.type === "agent" && msg.completedAt && idx === history.length - 1 && !processing && (
                                    <FeedbackForm
                                        projectName={modelId}
                                        context={{
                                            inputs: idx > 0 && history[idx - 1]?.type === "user" ? history[idx - 1].content : undefined,
                                            outputs: msg.content,
                                            sessionTurns: history,
                                        }}
                                        onFeedbackSubmitted={() => {
                                            refreshFeedbackHistory();
                                            if (!showFeedbackHistory) setShowFeedbackHistory(true);
                                        }}
                                    />
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
                        <div className="w-full max-w-4xl">
                            <div className="flex items-center gap-2 text-gray-500 animate-pulse px-1">
                                <RefreshCw className="animate-spin" size={16} />
                                <span>Assistant is thinking...</span>
                            </div>
                        </div>
                    )}
                    
                </div>
                <div
                    ref={historyEndRef}
                    style={{
                        height: 1,
                        scrollMarginBottom: `${composerDockHeight + 24}px`,
                    }}
                />

                </div>
            </main>

            {/* Feedback History Sidebar */}
            {allowFeedback && showFeedbackHistory && (
                <div className="w-[300px] h-full shrink-0 border-l border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-col overflow-hidden">
                    <div className="p-2 flex justify-between items-center border-b border-gray-200 dark:border-slate-700">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">Feedback History</h3>
                        <button
                            type="button"
                            onClick={() => setShowFeedbackHistory(false)}
                            className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            title="Hide feedback history"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
                        <FeedbackList
                            history={feedbackHistory}
                            loading={loadingHistory}
                            onDelete={handleDeleteFeedback}
                            onSelect={handleSelectFeedback}
                        />
                    </div>
                </div>
            )}
            </div>

            {/* Input Area (sticky, always visible) */}
            <div
                ref={composerDockRef}
                className="sticky bottom-0 z-40 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:to-transparent"
            >
                <div className="max-w-4xl mx-auto px-4 py-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
                    {currentFormInputs ? (
                        isQuickChoiceComposer && quickChoiceInput ? (
                            <div className="mx-auto w-full rounded-[28px] bg-white/95 dark:bg-slate-800/95 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.7)] ring-1 ring-slate-200/80 dark:ring-slate-600/80 backdrop-blur px-4 pt-3 pb-3">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                    {quickChoiceInput.label || quickChoiceInput.name || "Choose an option"}
                                </div>
                                {quickChoiceInput.description && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        {quickChoiceInput.description}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {quickChoiceOptions.map((option, index) => (
                                        <button
                                            key={`${String(option.value)}-${index}`}
                                            type="button"
                                            disabled={processing || initializing}
                                            onClick={() => handleQuickChoiceSubmit(option.value)}
                                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : isSimpleComposer && primaryTextInput ? (
                            <form
                                onSubmit={handleSubmit}
                                onKeyDown={handleComposerKeyDown}
                                className="mx-auto w-full rounded-[28px] bg-white/95 dark:bg-slate-800/95 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.7)] ring-1 ring-slate-200/80 dark:ring-slate-600/80 backdrop-blur px-4 pt-3 pb-3"
                            >
                                <textarea
                                    ref={composerTextareaRef}
                                    name={primaryTextInput.name}
                                    value={messageValue}
                                    required={primaryTextInput.required}
                                    rows={2}
                                    placeholder={primaryTextInput.label || "Message"}
                                    onChange={(e) => {
                                        handleInputChange(primaryTextInput.name, e.target.value);
                                        requestAnimationFrame(resizeComposerTextarea);
                                    }}
                                    className="w-full min-h-[64px] max-h-[360px] resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-6 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
                                />
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Enter to send, Shift+Enter for newline</div>
                                    <button
                                        type="submit"
                                        disabled={processing || initializing || !canSubmitCurrentInputs}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                        title="Send message"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmit} onKeyDown={handleComposerKeyDown} className="mx-auto w-full rounded-3xl ring-1 ring-slate-200/80 dark:ring-slate-700/80 bg-white/95 dark:bg-slate-800/95 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.7)] p-4 backdrop-blur">
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
                                        disabled={processing || initializing || !canSubmitCurrentInputs}
                                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                    >
                                        <Send size={16} />
                                        Send
                                    </button>
                                </div>
                            </form>
                        )
                    ) : (
                        <div className="mx-auto w-full rounded-[24px] ring-1 ring-slate-200/70 dark:ring-slate-700/70 bg-white/90 dark:bg-slate-800/90 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.8)] px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between gap-4">
                            <span>
                                {processing
                                    ? "Waiting for assistant…"
                                    : wasStopped
                                        ? "Stopped. Restart the session to try again."
                                        : "Waiting for assistant…"}
                            </span>
                            <button
                                type="button"
                                onClick={restartSession}
                                disabled={initializing || processing}
                                className={restartButtonClass}
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
