import React from "react";
import { ModelInput, ModelInputConstraint } from "../../types/ModelMeta";

interface ModelInputFieldProps {
    input: ModelInput;
    value: any;
    constraints?: ModelInputConstraint;
    onChange: (name: string, value: any) => void;
}

const ModelInputField: React.FC<ModelInputFieldProps> = ({ input, value, constraints, onChange }) => {
    let options = constraints?.options;
    if (Array.isArray(options) && typeof options[0] === "object") {
        options = (options as any[]).map(opt => ({
            value: opt.value,
            label: opt.label || opt.value
        }));
    }

    return (
        <div className="flex flex-col">
            <label className="font-medium mb-1">
                {input.label || input.name}
                {input.required && <span className="text-red-500 ml-1">*</span>}
                {input.unit && <span className="ml-2 text-xs text-gray-400">({input.unit})</span>}
            </label>
            
            {input.type === "string" && (
                <input
                    type="text"
                    name={input.name}
                    value={value}
                    required={input.required}
                    pattern={constraints?.regex}
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1"
                />
            )}
            
            {(input.type === "float" || input.type === "int") && (
                <input
                    type="number"
                    name={input.name}
                    value={value}
                    required={input.required}
                    min={constraints?.min}
                    max={constraints?.max}
                    step="any"
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1"
                />
            )}
            
            {input.type === "category" && Array.isArray(options) && (
                <select
                    name={input.name}
                    value={value}
                    required={input.required}
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1"
                >
                    <option value="">Select...</option>
                    {typeof options[0] === "string"
                        ? (options as string[]).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))
                        : (options as { value: string; label?: string }[]).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label || opt.value}</option>
                        ))
                    }
                </select>
            )}
            
            {input.type === "boolean" && (
                <input
                    type="checkbox"
                    name={input.name}
                    checked={!!value}
                    onChange={e => onChange(input.name, e.target.checked)}
                    className="h-4 w-4"
                />
            )}
            
            {input.description && (
                <span className="text-xs text-gray-500 mt-1">{input.description}</span>
            )}
        </div>
    );
};

export default ModelInputField;
