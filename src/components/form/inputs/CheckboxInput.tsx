import React from "react";
import { BaseInputProps } from "./types";

export const CheckboxInput: React.FC<BaseInputProps> = ({ input, value, onChange }) => {
    return (
        <input
            type="checkbox"
            name={input.name}
            checked={!!value}
            onChange={e => onChange(input.name, e.target.checked)}
            className="h-5 w-5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500"
        />
    );
};
