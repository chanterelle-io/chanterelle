
import type { ModelMeta } from '../../types/ModelMeta';
import type { ModelInputs } from "../../types/ModelInputs";
import { ModelResponse, ModelInvokeResponse } from "../../types/ModelResponse";
import { invoke } from '@tauri-apps/api/core';

// Rmk: for extra secure flow, invokeModel should make sure the user has access to the model (again)
export async function invokeModel(model: ModelMeta, project_name: string, inputs: ModelInputs): Promise<ModelResponse> {
    console.log('invoking model for project:', project_name, 'with inputs:', inputs);
    const startTime = Date.now();
    try {
        // let r_warmup = await invoke('warmup_model', { projectName: project_name }) as string;
        // console.log('Model warmup response:', r_warmup);
        let r =  await invoke('invoke_model', { projectName: project_name, inputs }) as ModelInvokeResponse;
        const endTime = Date.now();
        const timeWaited = endTime - startTime;
        console.log(`Model invocation completed in ${timeWaited}ms`);
        console.log('Model meta fetched:', r);
        // build output table from metadata and prediction
        const output = r.prediction.map((pred: any, index: number) => {
            const outputMeta = model.outputs[index];
            if (!outputMeta) {
                throw new Error(`Output meta not found for index ${index}`);
            }
            return {
                name: outputMeta.name,
                label: outputMeta.label,
                value: pred, // Assuming pred is the value for this output
                type: outputMeta.type,
                unit: outputMeta.unit,
                description: outputMeta.description,
                min: outputMeta.min,
                max: outputMeta.max,
                options: outputMeta.options,
            };
        });
        return {
            model_id: model.model_id,
            version: '1.0',
            content: [], // Empty content array for base implementation
            output,
            sensitivity_curves: r.sensitivity_curves
        } as ModelResponse;

    } catch (error) {
        console.error('Error invoking model:', error);
        if (typeof error === 'string' && error.includes('No projects directory set')) {
            throw new Error('Please configure your projects directory in settings first.');
        }
        throw error;
    }
}