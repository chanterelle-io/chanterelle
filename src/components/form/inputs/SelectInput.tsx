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
            className="w-full h-12 rounded-2xl border border-slate-300/90 dark:border-slate-600 bg-white/95 dark:bg-slate-700/90 px-4 text-[15px] text-slate-900 dark:text-gray-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500"
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
