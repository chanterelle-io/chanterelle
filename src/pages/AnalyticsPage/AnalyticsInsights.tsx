import React from "react";
import { AnalyticsInsightsType } from "../../types/Project";
import { InsightsLayout } from "../../components/insights";

interface AnalyticsInsightsProps {
  insights: AnalyticsInsightsType;
}

const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ insights }) => {
  const content = Array.isArray(insights?.content) ? insights.content : [];

  if (content.length === 0) {
    return (
      <div className="px-4 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
        <div className="p-6 my-4 rounded border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
          <div className="font-semibold mb-1">No analytics insights to display.</div>
          <div className="text-sm">The project is rendering an empty or invalid insights payload. Please check the project file(s).</div>
        </div>
      </div>
    );
  }

  return <InsightsLayout content={content} />;
};

export default AnalyticsInsights;

