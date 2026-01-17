import { invoke } from '@tauri-apps/api/core';

export interface FeedbackData {
    rating: 'up' | 'down';
    comment?: string;
    context?: any; // E.g. inputs, outputs
}

export async function submitFeedback(project_name: string, feedback: FeedbackData): Promise<number> {
    console.log('Submitting feedback for project:', project_name, feedback);
    try {
        const timestamp = await invoke<number>('submit_feedback', { projectName: project_name, feedback });
        console.log('Feedback submitted successfully, timestamp:', timestamp);
        return timestamp;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }
}
