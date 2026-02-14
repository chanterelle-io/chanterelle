import { invoke } from "@tauri-apps/api/core";

export async function forceKillPython(): Promise<boolean> {
    try {
        const killed = await invoke("force_kill_python_process");
        return Boolean(killed);
    } catch (error) {
        console.error("Failed to force-kill Python process:", error);
        return false;
    }
}
