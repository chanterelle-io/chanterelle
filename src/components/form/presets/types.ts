import { ModelInputPreset, ModelInputConstraint } from "../../../types/ModelMeta";

export interface BasePresetProps {
    preset: ModelInputPreset;
    selectedValue: string;
    constraints?: ModelInputConstraint;
    onPresetChange: (preset: ModelInputPreset, selectedName: string) => void;
}
