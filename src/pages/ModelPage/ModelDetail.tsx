import { ModelMeta } from "../../types/ModelMeta";
// import { openPath } from '@tauri-apps/plugin-opener'; 
// import ModelLogo from "../../components/common/ModelLogo";

// Model Detail Component
interface ModelDetailProps {
    model: ModelMeta;
}

const ModelDetail: React.FC<ModelDetailProps> = ({ model }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{model.model_name}</h2>
                {/* <ModelLogo outputType={model.outputs[0]?.type} size={24} /> */}
            </div>
            <p className="text-gray-700 mb-4">{model.description}</p>

            {model.links && model.links.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-base text-gray-800 mb-1">Links</h3>
                    <div className="flex flex-wrap gap-3 border border-gray-200 rounded-md p-2">
                        {model.links.map((link, idx) => (
                            <span key={idx}>
                                {link.url ? (
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm font-bold px-2 py-1 rounded"
                                    >
                                        {link.name || link.url}
                                    </a>
                                ) : link.file_name ? (
                                    <div className="flex flex-col">
                                        <span className="text-green-700 text-sm font-bold px-2 py-1">
                                            {link.name || link.file_name}
                                        </span>
                                        <span className="text-xs text-gray-500 px-2">{link.file_name}</span>
                                    </div>
                                ) : null}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-md font-semibold mb-3">Input Parameters</h3>
                <div className="overflow-hidden border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Constraints</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {model.inputs.map((input, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{input.label || input.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{input.type}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{input.description}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {input.constraints?.min !== undefined && input.constraints?.max !== undefined &&
                                            `Range: ${input.constraints.min} - ${input.constraints.max} `
                                        }
                                        {input.constraints?.options &&
                                            `Options: ${Array.isArray(input.constraints.options)
                                                ? (typeof input.constraints.options[0] === 'string'
                                                    ? (input.constraints.options as string[]).join(', ')
                                                    : (input.constraints.options as { value: string; label?: string }[])
                                                        .map(opt => opt.label || opt.value)
                                                        .join(', '))
                                                : ''
                                            } `
                                        }
                                        {input.constraints?.regex &&
                                            `Pattern: ${input.constraints.regex} `
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-md p-3">
                    <p className="text-sm text-gray-500 mb-2">Output(s)</p>
                    {model.outputs && model.outputs.length > 0 ? (
                        <ul className="space-y-2">
                            {model.outputs.map((output, idx) => (
                                <li key={idx} className="text-sm">
                                    <div>
                                        <span className="font-medium">{output.label || output.name}</span>
                                        <span className="ml-2 text-sm text-gray-500">(type: {output.type.charAt(0).toUpperCase() + output.type.slice(1)}
                                            {output.unit ? `, unit: ${output.unit}` : ''})
                                        </span>
                                    </div>
                                    {output.description && (
                                        <div className="text-xs text-gray-600">{output.description}</div>
                                    )}
                                    {output.min != undefined && (
                                        <div className="text-xs text-gray-600">Min: {output.min}</div>
                                    )}
                                    {output.max != undefined && (
                                        <div className="text-xs text-gray-600">Max: {output.max}</div>
                                    )}
                                    {output.options && (
                                        <div className="text-xs text-gray-600">Options: {Array.isArray(output.options)
                                            ? (typeof output.options[0] === 'string'
                                                ? (output.options as string[]).join(', ')
                                                : (output.options as { value: string; label?: string }[])
                                                    .map(opt => opt.label || opt.value)
                                                    .join(', '))
                                            : ''
                                        }</div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <span className="text-xs text-gray-400">No outputs defined</span>
                    )}
                </div>
                <div className="border border-gray-200 rounded-md p-3">
                    <p className="text-sm text-gray-500">Model ID / Version</p>
                    <p className="font-medium font-mono text-sm">{model.model_id} / v{model.model_version}</p>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                    {model.tags && Object.keys(model.tags).length > 0 ? (
                        Object.entries(model.tags).map(([tag, value]) => (
                            <span key={tag} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {tag}{value ? `: ${value}` : ''}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400">No tags</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModelDetail;
