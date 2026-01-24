import type { ProjectMeta } from "../../types/Project";

import { invoke } from '@tauri-apps/api/core';


export async function listProjects(): Promise<ProjectMeta[]> {
    try {
        let s =  await invoke('list_projects');
        console.log('Projects fetched:', s);
        return s as ProjectMeta[];
    } catch (error) {
        if (typeof error === 'string' && error.includes('No projects directory set')) {
            throw new Error('Please configure your projects directory in settings first.');
        }
        throw error;
    }
}