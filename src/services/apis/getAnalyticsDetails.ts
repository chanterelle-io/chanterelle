import { invoke } from '@tauri-apps/api/core';
import { AnalyticsInsightsType } from '../../types/Project';

export interface AnalyticsDetails {
    insights: AnalyticsInsightsType;
    project_path: string;
}

export async function getAnalyticsDetails(projectName: string): Promise<AnalyticsDetails> {
    const details = await invoke('get_analytics_details', { projectName: projectName }) as AnalyticsDetails;
    return details;
}
