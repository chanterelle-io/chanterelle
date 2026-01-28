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
