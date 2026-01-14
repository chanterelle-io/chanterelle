import { ModelInput, ModelInputConstraint, ModelInputPreset } from "../types/ModelMeta";
import { ModelInputs } from "../types/ModelInputs";

// Helper to merge constraints (base + override)
export const mergeConstraints = (base?: ModelInputConstraint, override?: ModelInputConstraint): ModelInputConstraint => {
    return { ...(base || {}), ...(override || {}) };
};

// Get effective constraints for an input (handles depends_on)
export const resolveEffectiveConstraints = (input: ModelInput, values: ModelInputs): ModelInputConstraint | undefined => {
    if (input.depends_on) {
        const parentValue = values[input.depends_on.input_name];
        const mapping = input.depends_on.mapping?.[parentValue];
        if (mapping && mapping.constraints) {
            return mergeConstraints(input.constraints, mapping.constraints);
        }
    }
    return input.constraints;
};

// Get effective constraints for a preset (handles depends_on)
export const resolveEffectivePresetConstraints = (preset: ModelInputPreset, values: ModelInputs): ModelInputConstraint | undefined => {
    if (preset.depends_on) {
        const parentValue = values[preset.depends_on.field];
        const mapping = preset.depends_on.mapping?.[parentValue];
        if (mapping && mapping.constraints) {
            return mapping.constraints;
        }
    }
    return undefined;
};
