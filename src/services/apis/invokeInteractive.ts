// src/services/apis/invokeInteractive.ts
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { ModelInputs } from '../../types/ModelInputs';
import { SectionType } from '../../components/insights';
import { ModelInput } from '../../types/ModelMeta';

export interface InteractiveOutput {
    outputs?: SectionType[];
    next_inputs?: ModelInput[];
    status?: string;
    done?: boolean;
    error?: string;
    response_id?: string;
    request_id?: string;
    event_type?: "partial" | "final" | "prompt";
    append?: boolean;
    stopped?: boolean;
}

export type InteractiveCallback = (data: InteractiveOutput) => void;

/**
 * Invokes an interactive session step.
 * 
 * @param projectName The name of the project folder
 * @param inputs The inputs to send to the Python script
 * @param onData Callback for receiving real-time updates from Python
 * @returns A promise that resolves when the *request* is sent (not when it finishes)
 */
export async function invokeInteractive(
    projectName: string, 
    inputs: ModelInputs, 
    onData: InteractiveCallback,
    requestId?: string,
): Promise<UnlistenFn> {
    console.log('Starting interactive session for:', projectName);

    // Set up the listener BEFORE invoking the command to ensure we don't miss early events
    const unlisten = await listen<InteractiveOutput>('interactive:output', (event) => {
        console.log('Interactive event:', event.payload);
        onData(event.payload);
    });

    // Kick off the Rust command but do NOT await it here.
    // In dev, React StrictMode can mount/unmount/remount quickly; awaiting here delays
    // exposing `unlisten`, which can lead to multiple active listeners and duplicated outputs.
    void invoke('invoke_interactive', { projectName: projectName, inputs: inputs, requestId })
        .catch((e: any) => {
            console.error("Error invoking interactive:", e);
            onData({ error: typeof e === 'string' ? e : e.message || "Unknown error" });
        });

    return unlisten;
}
