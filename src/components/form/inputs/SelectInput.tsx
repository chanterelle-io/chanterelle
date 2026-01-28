import React from "react";
import { BaseInputProps } from "./types";

export const SelectInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    let options = constraints?.options;
    if (Array.isArray(options) && typeof options[0] === "object") {
        options = (options as any[]).map(opt => ({
            value: opt.value,
            label: opt.label || opt.value
        }));
    }

    if (!Array.isArray(options)) {
        return null;
    }

    return (
        <select
            name={input.name}
            value={value}
            required={input.required}
            onChange={e => onChange(input.name, e.target.value)}
            className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
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
    );
};
