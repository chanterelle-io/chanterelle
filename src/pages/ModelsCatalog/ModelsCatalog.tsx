import React, { useState, useEffect } from "react";
// import mlLogo from '../../assets/ml-logo.png';
import appLogo from '../../assets/chanterelle.png';
// import Header from "../../components/layout/Header";
import { ModelMetaShort } from "../../types/ModelMeta";
import ModelCard from "./ModelCard";
import { useNavigate } from "react-router";
import { listModels } from "../../services/apis/listModels";
import { RotateCcw, Settings } from "lucide-react";

// Main App Component
const ModelsCatalog: React.FC = () => {
    const navigate = useNavigate();
    const [models, setModels] = useState<ModelMetaShort[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadModels = () => {
        setLoading(true);
        setError(null);
        listModels()
            .then(setModels)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadModels();
        document.title = "ML @ SSAB - Home";
    }, []);

    const filteredModels = models.filter(model =>
        model.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (model.tags && Object.values(model.tags).some(tagValue => tagValue.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
        <div className="min-h-screen bg-indigo-50">
            {/* <Header /> */}
            <div className="fixed top-6 right-6 flex items-center justify-between mb-4">
                    {/* <div className="flex-1"></div> */}
                    <button
                        onClick={loadModels}
                        disabled={loading}
                        className="flex items-center text-blue-600 hover:text-blue-400 hover:cursor-pointer disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Refresh models list"
                    >
                        <RotateCcw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={16} /> Refresh
                    </button>
                </div>
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
                    <img
                            src={appLogo}
                            alt="ML Logo"
                            className="h-16 w-16 object-contain"
                        />
                    {/* <Brain className="text-blue-600" size={24} /> */}
                    <h1 className="ml-6 text-5xl font-bold font-mono text-blue-950 flex items-center">
                        Chanterelle
                    </h1>
                </div>
                <div className="flex flex-col items-center justify-center mb-8">
                    <p className="ml-2 text-l font-mono text-gray-700 mb-3">
                        Explore and Invoke Machine Learning Models
                    </p>
                    <input
                        type="text"
                        placeholder="Search models..."
                        className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading models...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-12">
                        <p className="text-red-500">Error: {error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredModels.map(model => (
                            <ModelCard
                                key={model.model_id}
                                model={model}
                                onClick={() => navigate(`/model/${model.project_name}`)}
                            />
                        ))}

                        {filteredModels.length === 0 && (
                            <div className="col-span-3 text-center py-12">
                                <p className="text-gray-500">No models found matching your search criteria.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
            
            {/* Settings Icon */}
            <button
                onClick={() => navigate('/settings')}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 z-10"
                title="Settings"
            >
                <Settings size={20} />
            </button>
        </div>
    );
};

export default ModelsCatalog;
