import React from "react";
import { BasePresetProps } from "./types";

export const SelectPreset: React.FC<BasePresetProps> = ({ preset, selectedValue, constraints, onPresetChange }) => {
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
            <label className="font-medium mb-1 text-slate-800 dark:text-slate-200">{preset.label} - preset </label>
            <select
                value={selectedValue || ""}
                onChange={e => onPresetChange(preset, e.target.value)}
                className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-gray-100"
            >
                <option value="">Select preset...</option>
                {filteredPresets.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                ))}
            </select>
            {preset.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.description}</div>
            )}
        </div>
    );
};
