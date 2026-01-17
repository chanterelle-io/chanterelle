import { invoke } from '@tauri-apps/api/core';
import type { FeedbackData } from './submitFeedback';

export interface FeedbackEntry {
    timestamp: number;
    feedback: FeedbackData;
}

export async function getFeedbackHistory(project_name: string): Promise<FeedbackEntry[]> {
    try {
        const history = await invoke('get_feedback_history', { projectName: project_name }) as FeedbackEntry[];
        return history || [];
    } catch (error) {
        console.error('Error fetching feedback history:', error);
        return [];
    }
}
