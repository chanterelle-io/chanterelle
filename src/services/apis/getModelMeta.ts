import type { ModelMeta } from '../../types/ModelMeta';
import type { ModelInsights } from '../../types/ModelInsights';
import { invoke } from '@tauri-apps/api/core';


export type ModelData = {
    model: ModelMeta;
    findings: ModelInsights | null;
    project_path: string; // Path to the project directory
};

export async function getModelMeta(project_name: string): Promise<ModelData> {
    console.log('Fetching model meta for project:', project_name);
    try {
        let r =  await invoke('get_model', { projectName: project_name });
        console.log('Model meta fetched:', r);
        // return r as ModelData;
        const data = r as ModelData;
        if (!data || !data.model) {
            throw new Error('Model meta data is empty or invalid');
        }
        const model_meta = data.model as ModelMeta;
        const findings = (data.findings || null) as ModelInsights | null;
        return {
            model: model_meta,
            findings: findings,
            project_path: data.project_path
        };

    } catch (error) {
        console.error('Error fetching model meta:', error);
        // Handle specific error types from Tauri backend
        if (typeof error === 'string') {
            throw new Error(error);
        } else if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('Unknown error occurred while fetching model metadata');
        }
    }
}