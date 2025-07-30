import { invoke } from '@tauri-apps/api/core';


export type WarmResponse = {
    warmup: boolean;
    error?: string;
};

export async function warmModel(project_name: string): Promise<WarmResponse> {
    console.log('warming model up for project:', project_name);
    try {
        let r = await invoke('warmup_model', { projectName: project_name }) as WarmResponse;
        console.log('Model warmup response:', r);
        // if (!r || !r.warmup) {
        //     throw new Error('Model warmup failed');
        // }
        return r;
    } catch (error) {
        console.error('Error fetching model meta:', error);
        if (typeof error === 'string' && error.includes('No projects directory set')) {
            throw new Error('Please configure your projects directory in settings first.');
        }
        throw error;
    }
}