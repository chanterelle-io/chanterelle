import React from "react";
import { BaseInputProps } from "./types";
import { open } from '@tauri-apps/plugin-dialog';

export const FileInput: React.FC<BaseInputProps> = ({ input, value, constraints, onChange }) => {
    return (
        <div>
            <button
                type="button"
                onClick={async () => {
                    try {
                        const filters = constraints?.extensions ? [{
                            name: 'Allowed files',
                            extensions: constraints.extensions.map(ext => ext.replace(/^\./, '')) // Remove leading dots if present
                        }] : [];
                        
                        const selected = await open({
                            title: `Select ${input.label || input.name}`,
                            multiple: constraints?.multiple || false,
                            filters: filters.length > 0 ? filters : undefined,
                        });
                        
                        if (selected) {
                            if (Array.isArray(selected)) {
                                // Multiple files selected
                                const fileObjects = selected.map(path => ({
                                    path,
                                    name: path.split(/[/\\]/).pop() || path
                                }));
                                onChange(input.name, fileObjects);
                            } else {
                                // Single file selected
                                const fileObject = {
                                    path: selected,
                                    name: selected.split(/[/\\]/).pop() || selected
                                };
                                onChange(input.name, fileObject);
                            }
                        }
                    } catch (error) {
                        console.error('Error opening file dialog:', error);
                    }
                }}
                className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 w-full text-left bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 dark:text-gray-100"
            >
                {value ? 'Change file...' : 'Select file...'}
            </button>
            
            {/* Display selected file names */}
            {value && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {Array.isArray(value) ? (
                        <div>
                            Selected files: <strong>{value.map((file: any) => file.name).join(', ')}</strong>
                        </div>
                    ) : (
                        <div>Selected file: <strong>{value.name}</strong></div>
                    )}
                </div>
            )}
        </div>
    );
};
