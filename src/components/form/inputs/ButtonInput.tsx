import React from "react";
import { BaseInputProps } from "./types";

export const ButtonInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    const inputName = input.name?.trim()
        || (input.label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
        || "choice";

    const options = constraints?.options;
    const normalizedOptions = Array.isArray(options)
        ? typeof options[0] === "string"
            ? (options as string[]).map((opt) => ({ label: opt, value: opt }))
            : (options as Array<{ value: string; label?: string }>).map((opt) => ({
                label: opt.label || opt.value || "Option",
                value: opt.value,
            }))
        : [];

    if (normalizedOptions.length === 0) {
        return (
            <button
                type="button"
                onClick={() => onChange(inputName, true)}
                className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
            >
                {input.label || inputName || "Select"}
            </button>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {normalizedOptions.map((opt) => {
                const selected = value === opt.value;
                return (
                    <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => onChange(inputName, opt.value)}
                        className={`rounded-xl px-4 py-2 text-sm transition border ${
                            selected
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                                : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                        }`}
                    >
                        {opt.label || "Option"}
                    </button>
                );
            })}
        </div>
    );
};
