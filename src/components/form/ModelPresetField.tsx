import React from "react";
import { ModelInputPreset, ModelInputConstraint } from "../../types/ModelMeta";

interface ModelPresetFieldProps {
    preset: ModelInputPreset;
    selectedValue: string;
    constraints?: ModelInputConstraint;
    onPresetChange: (preset: ModelInputPreset, selectedName: string) => void;
}

const ModelPresetField: React.FC<ModelPresetFieldProps> = ({ preset, selectedValue, constraints, onPresetChange }) => {
    // If depends_on, filter presets by constraints.options if present
    let filteredPresets = preset.presets;
    if (constraints?.options) {
        const allowed = Array.isArray(constraints.options)
            ? constraints.options.map(opt => typeof opt === "string" ? opt : opt.value)
            : [];
        filteredPresets = preset.presets.filter(p => allowed.includes(p.name));
    }

    return (
        <div className="flex flex-col">
            <label className="font-normal mb-1">{preset.label} - preset </label>
            <select
                value={selectedValue || ""}
                onChange={e => onPresetChange(preset, e.target.value)}
                className="border rounded px-2 py-1"
            >
                <option value="">Select preset...</option>
                {filteredPresets.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                ))}
            </select>
            {preset.description && (
                <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
            )}
        </div>
    );
};

export default ModelPresetField;
