import React from "react";
import { ModelInsightsType } from "../../types/Project";
import { InsightsLayout } from "../../components/insights";

interface ModelInsightsPageProps {
  insights: ModelInsightsType;
}

const ModelInsightsPage: React.FC<ModelInsightsPageProps> = ({ insights }) => {
  return <InsightsLayout content={insights.content} />;
};

export default ModelInsightsPage;

