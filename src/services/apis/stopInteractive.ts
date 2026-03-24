import { invoke } from "@tauri-apps/api/core";

export async function stopInteractive(requestId?: string): Promise<boolean> {
    try {
        const stopped = await invoke("stop_interactive", { requestId });
        return Boolean(stopped);
    } catch (error) {
        console.error("Failed to stop interactive request:", error);
        return false;
    }
}
