import React from "react";
import { BaseInputProps } from "./types";

export const YesNoInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    const inputName = input.name?.trim()
        || (input.label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
        || "choice";

    const yesLabel = constraints?.yes_label || "Yes";
    const noLabel = constraints?.no_label || "No";
    const yesValue = constraints?.yes_value !== undefined ? constraints.yes_value : true;
    const noValue = constraints?.no_value !== undefined ? constraints.no_value : false;

    const isYesSelected = value === yesValue;
    const isNoSelected = value === noValue;

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => onChange(inputName, yesValue)}
                className={`rounded-xl px-4 py-2 text-sm transition border ${
                    isYesSelected
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
            >
                {yesLabel}
            </button>
            <button
                type="button"
                onClick={() => onChange(inputName, noValue)}
                className={`rounded-xl px-4 py-2 text-sm transition border ${
                    isNoSelected
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
            >
                {noLabel}
            </button>
        </div>
    );
};
