import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import LoadSpinner from "../../components/common/LoadSpinner";
import AnalyticsInsights from "./AnalyticsInsights";
import { getAnalyticsDetails, AnalyticsDetails } from "../../services/apis/getAnalyticsDetails";
import { useProjectContext } from "../../contexts/ProjectContext";

const AnalyticsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { setProjectPath } = useProjectContext();
    const [details, setDetails] = useState<AnalyticsDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadDetails = () => {
        if (projectId) {
            setLoading(true);
            setError(null);
            getAnalyticsDetails(projectId)
                .then((data) => {
                    setDetails(data);
                    setProjectPath(data.project_path);
                })
                .catch((err) => setError(String(err)))
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => {
        loadDetails();
    }, [projectId]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
             <div className="sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                title="Back to catalog"
                            >
                                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                        
                        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white truncate max-w-[50%]">
                            {projectId}
                        </h1>

                        <div className="flex items-center">
                            <button
                                onClick={loadDetails}
                                disabled={loading}
                                className="flex items-center text-blue-600 hover:text-blue-400 dark:hover:text-blue-500 hover:cursor-pointer disabled:text-gray-400 disabled:cursor-not-allowed"
                                title="Refresh analytics"
                            >
                                <RotateCcw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={16} /> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {loading && !details && <LoadSpinner />}
            {!loading && error && <div className="p-8 text-red-500">Error: {error}</div>}
            {!loading && !error && !details && <div className="p-8">No details found.</div>}
            {!!details && <AnalyticsInsights insights={details.insights} />}
        </div>
    );
};

export default AnalyticsPage;
