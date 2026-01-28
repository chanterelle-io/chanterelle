import React from "react";
import { BaseInputProps } from "./types";

export const TextInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    return (
        <input
            type="text"
            name={input.name}
            value={value}
            required={input.required}
            pattern={constraints?.regex}
            placeholder={constraints?.placeholder}
            onChange={e => onChange(input.name, e.target.value)}
            className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
        />
    );
};
