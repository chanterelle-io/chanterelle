import React from "react";
import { BaseInputProps } from "./types";

export const CheckboxInput: React.FC<BaseInputProps> = ({ input, value, onChange }) => {
    return (
        <input
            type="checkbox"
            name={input.name}
            checked={!!value}
            onChange={e => onChange(input.name, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700"
        />
    );
};
