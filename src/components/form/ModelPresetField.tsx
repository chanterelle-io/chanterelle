import React from "react";
import { ModelInputPreset, ModelInputConstraint } from "../../types/ModelMeta";
import { getPresetComponent } from "./presets";

interface ModelPresetFieldProps {
    preset: ModelInputPreset;
    selectedValue: string;
    constraints?: ModelInputConstraint;
    onPresetChange: (preset: ModelInputPreset, selectedName: string) => void;
}

const ModelPresetField: React.FC<ModelPresetFieldProps> = (props) => {
    // Determine preset type if your metadata supports it, otherwise default
    // For example: const Component = getPresetComponent(props.preset.type || "default");
    const Component = getPresetComponent("default");

    return <Component {...props} />;
};

export default ModelPresetField;
