import { invoke } from '@tauri-apps/api/core';

export async function updateFeedback(projectName: string, timestamp: number, context: any): Promise<void> {
    try {
        await invoke('update_feedback', { projectName, timestamp, context });
    } catch (error) {
        console.error('Error updating feedback:', error);
        throw error;
    }
}
