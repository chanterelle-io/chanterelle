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
            className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-gray-100"
        />
    );
};
