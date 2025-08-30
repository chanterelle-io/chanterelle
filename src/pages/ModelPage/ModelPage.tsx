import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import ModelDetail from "./ModelDetail";
import ModelForm from "./ModelForm";
import { ArrowLeft, RotateCcw, Play, CheckCircle, AlertCircle } from "lucide-react";
import { getModelMeta, ModelData } from "../../services/apis/getModelMeta";
import { warmModel } from "../../services/apis/warmModel";
import { useProjectContext } from '../../contexts/ProjectContext';
import ModelInsightsPage from "./ModelInsights";

const ModelPage: React.FC = () => {
    const { modelId } = useParams<{ modelId: string }>(); // actually it's project name
    const navigate = useNavigate();

    const { setProjectPath } = useProjectContext();

    const [modelData, setModelData] = useState<ModelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"detail" | "insights" | "form">("detail"); // Tab state
    
    // Model warming state
    const [isWarming, setIsWarming] = useState(false);
    const [warmStatus, setWarmStatus] = useState<'idle' | 'warming' | 'ready' | 'error'>('idle');
    const [warmError, setWarmError] = useState<string | null>(null);

    const loadModelData = () => {
        if (!modelId) return;
        setLoading(true);
        setError(null);
        getModelMeta(modelId)
            .then((data) => {
                setModelData(data);
                setProjectPath(data.project_path);
            })
            // .catch((err) => setError(err.message))
            .catch((err) => {
                console.error('Error loading model data 2:', err);
                setError(err instanceof Error ? err.message : 'Failed to load model data');
                setModelData(null);
            })
            .finally(() => setLoading(false));
    };

    const handleWarmModel = async () => {
        if (!modelId) return;
        
        setIsWarming(true);
        setWarmStatus('warming');
        setWarmError(null);
        
        try {
            const response = await warmModel(modelId);
            if (response.warmup) {
                setWarmStatus('ready');
            } else {
                setWarmStatus('error');
                setWarmError(response.error || 'Failed to warm up model');
            }
        } catch (error) {
            setWarmStatus('error');
            setWarmError(error instanceof Error ? error.message : 'Failed to warm up model');
        } finally {
            setIsWarming(false);
        }
    };

    useEffect(() => {
        loadModelData();
        // Automatically warm up the model when the page loads
        handleWarmModel();
        document.title = `ML @ SSAB - ${modelId}`;
    }, [modelId]);

    if (!modelData && !loading && !error) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Model not found.</p>
                <button
                    onClick={() => navigate("/")}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Back to Catalog
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-5 pt-3 sm:px-2 lg:px-4">
            <div className="sticky top-0 z-10 bg-gray-50 mb-2 flex items-center justify-between">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center text-blue-600 hover:text-blue-400 hover:cursor-pointer"
                >
                    <ArrowLeft className="mr-1" size={16} /> Back to catalog
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleWarmModel}
                        disabled={isWarming}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            warmStatus === 'ready' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : warmStatus === 'error'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={
                            warmStatus === 'ready' ? 'Model is ready' :
                            warmStatus === 'error' ? `Error: ${warmError}` :
                            warmStatus === 'warming' ? 'Warming up model...' :
                            'Warm up model'
                        }
                    >
                        {warmStatus === 'warming' && <RotateCcw className="mr-1 animate-spin" size={14} />}
                        {warmStatus === 'ready' && <CheckCircle className="mr-1" size={14} />}
                        {warmStatus === 'error' && <AlertCircle className="mr-1" size={14} />}
                        {warmStatus === 'idle' && <Play className="mr-1" size={14} />}
                        <span>
                            {warmStatus === 'warming' ? 'Warming...' :
                             warmStatus === 'ready' ? 'Ready' :
                             warmStatus === 'error' ? 'Error' :
                             'Warm Up'}
                        </span>
                    </button>
                    <button
                        onClick={loadModelData}
                        disabled={loading}
                        className="flex items-center text-blue-600 hover:text-blue-400 hover:cursor-pointer disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Refresh model metadata & findings"
                    >
                        <RotateCcw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={16} /> Refresh
                    </button>
                </div>
            </div>
            {warmStatus === 'error' && warmError && (
                <div className="mb-4 text-red-500 text-sm">
                    <strong>Warm-up Error:</strong> {warmError}
                </div>
            )}
            {loading && <div className="mb-4 text-gray-500">Loading model ...</div>}
            {error && <div className="mb-4 text-red-500">Error: {error}</div>}
            {modelData && (
                <>
                    {/* Tabs */}
                    <div className="mb-6 flex border-b">
                        <button
                            className={`px-4 py-2 -mb-px border-b-2 ${
                                activeTab === "detail"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 cursor-pointer"
                            }`}
                            onClick={() => setActiveTab("detail")}
                        >
                            Model Card
                        </button>
                        {modelData.findings && (
                            <button
                                className={`px-4 py-2 -mb-px border-b-2 ${
                                    activeTab === "insights"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 cursor-pointer"
                                }`}
                                onClick={() => setActiveTab("insights")}
                            >
                                Insights
                            </button>
                        )}
                        <button
                            className={`ml-2 px-4 py-2 -mb-px border-b-2 ${
                                activeTab === "form"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 cursor-pointer"
                            }`}
                            onClick={() => setActiveTab("form")}
                        >
                            Practice
                        </button>
                    </div>
                    {/* Tab content */}
                    {activeTab === "detail" && <ModelDetail model={modelData.model} />}
                    {activeTab === "insights" && modelData.findings && <ModelInsightsPage insights={modelData.findings} />}
                    {activeTab === "form" && <ModelForm model={modelData.model} />}
                </>
            )}
        </div>
    );
};

export default ModelPage;