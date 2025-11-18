import React from "react";
import { ModelInput, ModelInputPreset, ModelInputGrouping, ModelInputConstraint } from "../../types/ModelMeta";
import { ModelInputs } from "../../types/ModelInputs";
import ModelInputField from "./ModelInputField";
import ModelPresetField from "./ModelPresetField";

interface ModelFormFieldsetProps {
    group: ModelInputGrouping & {
        items: Array<{ type: "input", item: ModelInput } | { type: "preset", item: ModelInputPreset }>;
    };
    values: ModelInputs;
    presetSelections: { [presetName: string]: string };
    getEffectiveConstraints: (input: ModelInput) => ModelInputConstraint | undefined;
    getEffectivePresetConstraints: (preset: ModelInputPreset) => ModelInputConstraint | undefined;
    handleChange: (name: string, value: any) => void;
    handlePresetChange: (preset: ModelInputPreset, selectedName: string) => void;
}

const ModelFormFieldset: React.FC<ModelFormFieldsetProps> = ({
    group,
    values,
    presetSelections,
    getEffectiveConstraints,
    getEffectivePresetConstraints,
    handleChange,
    handlePresetChange
}) => {
    return (
        <fieldset className="border border-gray-300 dark:border-slate-600 rounded p-3 mb-4">
            <legend className="font-bold bg-gray-50 dark:bg-slate-700 dark:text-slate-200 px-2 text-sm mb-2">
                {group.description || group.grouping}
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {group.items.map((entry) =>
                    entry.type === "input" ? (
                        <ModelInputField
                            key={entry.item.name}
                            input={entry.item}
                            value={values[entry.item.name]}
                            constraints={getEffectiveConstraints(entry.item)}
                            onChange={handleChange}
                        />
                    ) : (
                        <ModelPresetField
                            key={entry.item.input_preset}
                            preset={entry.item}
                            selectedValue={presetSelections[entry.item.input_preset]}
                            constraints={getEffectivePresetConstraints(entry.item)}
                            onPresetChange={handlePresetChange}
                        />
                    )
                )}
            </div>
        </fieldset>
    );
};

export default ModelFormFieldset;
