import React from "react";
import { BaseInputProps } from "./types";

export const NumberInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    return (
        <input
            type="number"
            name={input.name}
            value={value}
            required={input.required}
            min={constraints?.min}
            max={constraints?.max}
            step="any"
            onChange={e => onChange(input.name, e.target.value)}
            className="w-full h-12 rounded-2xl border border-slate-300/90 dark:border-slate-600 bg-white/95 dark:bg-slate-700/90 px-4 text-[15px] text-slate-900 dark:text-gray-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500"
        />
    );
};
