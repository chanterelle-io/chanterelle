import { ModelMetaShort } from "../../types/ModelMeta";
// import ModelLogo from "../../components/common/ModelLogo";

// Model Card Component
interface ModelCardProps {
    model: ModelMetaShort;
    onClick: (model: ModelMetaShort) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, onClick }) => (
    <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between border border-transparent dark:border-slate-700"
        onClick={() => onClick(model)}
    >
        {/* <div className="flex flex-col items-center mb-4"> */}

        <div className="flex flex-row justify-center items-center bg-blue-900 dark:bg-slate-700 rounded-t-lg mb-4">
            <h3 className="text-lg text-center font-semibold font-mono text-white p-2">{model.model_name}</h3>
            {/* <ModelLogo outputType={model.outputType} size={20}/>             */}
        </div>
    <p className="text-gray-600 dark:text-gray-300 mb-4 px-4 self-center">{model.description_short || model.description}</p>
        <div className="flex flex-row flex-wrap gap-2 mb-2 justify-center">
            {model.tags && Object.entries(model.tags).map(([key, value]) => (
                <span key={key} className="bg-orange-200 dark:bg-slate-600 text-orange-800 dark:text-slate-200 text-xs font-semibold px-2 py-1 rounded-lg">
                    {value}
                </span>
            ))}
        </div>
        {/* <div className="flex flex-row justify-between items-center text-sm text-gray-500">
            <div>Inputs: {model.inputs.length}</div>
            <div>Output: {model.outputType}</div>
        </div> */}
        </div>
    // </div>
);

export default ModelCard;