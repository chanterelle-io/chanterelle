// src/services/api.ts
import { invoke } from '@tauri-apps/api/core';

// export interface ModelInfo {
//     id: string;
//     name: string;
//     description: string;
//     lastModified: string;
// }

// export interface ModelDetails {
//     metadata: any;
//     form: any;
//     findings?: any;
// }

export interface Settings {
    projects_directory: string;
}

// export class ModelService {
//     static async listModels(): Promise<ModelInfo[]> {
//         try {
//             return await invoke('list_models');
//         } catch (error) {
//             if (typeof error === 'string' && error.includes('No projects directory set')) {
//                 throw new Error('Please configure your projects directory in settings first.');
//             }
//             throw error;
//         }
//     }

//     static async getModel(modelId: string): Promise<ModelDetails> {
//         return await invoke('get_model', { modelId });
//     }

//     static async invokeModel(modelId: string, inputs: Record<string, any>): Promise<any> {
//         return await invoke('invoke_model', { modelId, inputs });
//     }

//     static async refreshModel(modelId: string): Promise<ModelDetails> {
//         return await invoke('refresh_model', { modelId });
//     }
// }

export class SettingsService {
    static async getSettings(): Promise<Settings> {
        return await invoke('get_settings');
    }

    static async saveSettings(settings: Settings): Promise<void> {
        // return await invoke('save_settings', { settings });
        return await invoke('set_projects_directory', { path: settings.projects_directory });
    }

    static async setProjectsDirectory(path: string): Promise<void> {
        return await invoke('set_projects_directory', { path });
    }

    static async openDirectoryDialog(): Promise<string | null> {
        return await invoke('open_directory_dialog');
    }
}