import type { ModelInputs } from "../../types/ModelInputs";
import type { SectionType } from "../../components/insights";
import { invoke } from '@tauri-apps/api/core';

// Rmk: for extra secure flow, invokeModel should make sure the user has access to the model (again)
// Note: File inputs are currently handled as metadata objects. The backend handles file uploads or just references.
export async function invokeModel(project_name: string, inputs: ModelInputs): Promise<SectionType[]> {
    console.log('invoking model for project:', project_name, 'with inputs:', inputs);
    const startTime = Date.now();
    try {
        // let r_warmup = await invoke('warmup_model', { projectName: project_name }) as string;
        // console.log('Model warmup response:', r_warmup);
        let r = await invoke('invoke_model', { projectName: project_name, inputs }) as SectionType[] | { error: string };
        const endTime = Date.now();
        const timeWaited = endTime - startTime;
        console.log(`Model invocation completed in ${timeWaited}ms`);
        
        // Check if response is an error object
        if (r && typeof r === 'object' && 'error' in r && !Array.isArray(r)) {
            console.log('Model returned error:', r);
            return [{
                type: 'section',
                id: 'error',
                color: 'red',
                title: 'Results',
                items: [{
                    type: 'error',
                    id: 'handler_error',
                    title: 'Error from the python handler',
                    error: r.error,
                }]
            }];
        }
        
        console.log('Model meta fetched:', r);
        return r as SectionType[];
    } catch (error) {
        console.error('Error invoking model:', error);
        if (typeof error === 'string' && error.includes('No projects directory set')) {
            throw new Error('Please configure your projects directory in settings first.');
        }
        throw error;
    }
}