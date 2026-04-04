import React from "react";
import { ModelInput, ModelInputConstraint } from "../../types/ModelMeta";
import { getInputComponent } from "./inputs";

interface ModelInputFieldProps {
    input: ModelInput;
    value: any;
    constraints?: ModelInputConstraint;
    onChange: (name: string, value: any) => void;
}

const ModelInputField: React.FC<ModelInputFieldProps> = ({ input, value, constraints, onChange }) => {
    const Component = getInputComponent(input.type);

    if (input.type === "boolean") {
        return (
            <div className="flex flex-col">
                {Component ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 px-3 py-2">
                        <label className="font-medium text-slate-800 dark:text-slate-200">
                            {input.label || input.name}
                            {input.required && <span className="text-red-500 ml-1">*</span>}
                            {input.unit && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({input.unit})</span>}
                        </label>
                        <Component
                            input={input}
                            value={value}
                            constraints={constraints}
                            onChange={onChange}
                        />
                    </div>
                ) : (
                    <span className="text-red-500 text-sm">Unsupported input type: {input.type}</span>
                )}

                {input.description && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{input.description}</span>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${input.type === "textarea" ? "col-span-full" : ""}`}>
            <label className="font-medium mb-1 text-slate-800 dark:text-slate-200">
                {input.label || input.name}
                {input.required && <span className="text-red-500 ml-1">*</span>}
                {input.unit && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({input.unit})</span>}
            </label>
            
            {Component ? (
                <Component
                    input={input}
                    value={value}
                    constraints={constraints}
                    onChange={onChange}
                />
            ) : (
                <span className="text-red-500 text-sm">Unsupported input type: {input.type}</span>
            )}
            
            {input.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{input.description}</span>
            )}
        </div>
    );
};

export default ModelInputField;
