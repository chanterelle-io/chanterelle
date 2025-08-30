import React from "react";
import { ModelInput, ModelInputConstraint } from "../../types/ModelMeta";
import { open } from '@tauri-apps/plugin-dialog';

interface ModelInputFieldProps {
    input: ModelInput;
    value: any;
    constraints?: ModelInputConstraint;
    onChange: (name: string, value: any) => void;
}

const ModelInputField: React.FC<ModelInputFieldProps> = ({ input, value, constraints, onChange }) => {
    let options = constraints?.options;
    if (Array.isArray(options) && typeof options[0] === "object") {
        options = (options as any[]).map(opt => ({
            value: opt.value,
            label: opt.label || opt.value
        }));
    }

    return (
        <div className="flex flex-col">
            <label className="font-medium mb-1">
                {input.label || input.name}
                {input.required && <span className="text-red-500 ml-1">*</span>}
                {input.unit && <span className="ml-2 text-xs text-gray-400">({input.unit})</span>}
            </label>
            
            {input.type === "string" && (
                <input
                    type="text"
                    name={input.name}
                    value={value}
                    required={input.required}
                    pattern={constraints?.regex}
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1"
                />
            )}
            
            {(input.type === "float" || input.type === "int") && (
                <input
                    type="number"
                    name={input.name}
                    value={value}
                    required={input.required}
                    min={constraints?.min}
                    max={constraints?.max}
                    step="any"
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1"
                />
            )}
            
            {input.type === "category" && Array.isArray(options) && (
                <select
                    name={input.name}
                    value={value}
                    required={input.required}
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1"
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
            )}
            
            {input.type === "boolean" && (
                <input
                    type="checkbox"
                    name={input.name}
                    checked={!!value}
                    onChange={e => onChange(input.name, e.target.checked)}
                    className="h-4 w-4"
                />
            )}
            
            {input.type === "textarea" && (
                <textarea
                    name={input.name}
                    value={value}
                    required={input.required}
                    rows={constraints?.rows || 4}
                    placeholder={constraints?.placeholder}
                    onChange={e => onChange(input.name, e.target.value)}
                    className="border rounded px-2 py-1 resize-vertical"
                />
            )}
            
            {input.type === "file" && (
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
                        className="border rounded px-2 py-1 w-full text-left bg-white hover:bg-gray-50"
                    >
                        {value ? 'Change file...' : 'Select file...'}
                    </button>
                    
                    {/* Display selected file names */}
                    {value && (
                        <div className="mt-1 text-sm text-gray-600">
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
            )}
            
            {input.description && (
                <span className="text-xs text-gray-500 mt-1">{input.description}</span>
            )}
        </div>
    );
};

export default ModelInputField;

// {input.type === "file" && (
//                 <div>
//                     <input
//                         type="file"
//                         name={input.name}
//                         required={input.required}
//                         accept={constraints?.accept}
//                         multiple={constraints?.multiple || false}
//                         onChange={e => {
//                             const files = e.target.files;
//                             if (files) {
//                                 onChange(input.name, constraints?.multiple ? Array.from(files) : files[0]);
//                             }
//                         }}
//                         className="border rounded px-2 py-1 w-full"
//                     />
//                     {/* Display selected file names */}
//                     {value && (
//                         <div className="mt-1 text-xs text-gray-600">
//                             {Array.isArray(value) ? (
//                                 <div>
//                                     Selected files: {value.map((file: File) => file.name).join(', ')}
//                                 </div>
//                             ) : (
//                                 <div>Selected file: {value.name}</div>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             )}
