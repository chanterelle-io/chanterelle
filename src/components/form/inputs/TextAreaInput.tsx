import React, { useEffect, useRef } from "react";
import { BaseInputProps } from "./types";

export const TextAreaInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resizeToContent = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
        resizeToContent();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            name={input.name}
            value={value}
            required={input.required}
            rows={constraints?.rows || 2}
            placeholder={constraints?.placeholder}
            onChange={e => {
                onChange(input.name, e.target.value);
                resizeToContent();
            }}
            className="w-full min-h-[72px] max-h-[360px] resize-none overflow-y-auto rounded-2xl border border-slate-300/90 dark:border-slate-600 bg-white/95 dark:bg-slate-700/90 px-4 py-3 text-[15px] leading-6 text-slate-900 dark:text-gray-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500"
        />
    );
};
