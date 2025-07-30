import type { ModelMetaShort } from '../../types/ModelMeta';

import { invoke } from '@tauri-apps/api/core';


export async function listModels(): Promise<ModelMetaShort[]> {
    try {
        let s =  await invoke('list_models');
        console.log('Models fetched:', s);
        return s as ModelMetaShort[];
    } catch (error) {
        if (typeof error === 'string' && error.includes('No projects directory set')) {
            throw new Error('Please configure your projects directory in settings first.');
        }
        throw error;
    }
}