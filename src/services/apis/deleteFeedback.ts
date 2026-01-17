import { invoke } from '@tauri-apps/api/core';

export async function deleteFeedback(projectName: string, timestamp: number): Promise<void> {
    console.log('Deleting feedback for project:', projectName, timestamp);
    try {
        await invoke('delete_feedback', { projectName, timestamp });
        console.log('Feedback deleted successfully');
    } catch (error) {
        console.error('Error deleting feedback:', error);
        throw error;
    }
}
