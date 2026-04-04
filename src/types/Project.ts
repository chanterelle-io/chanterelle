import { SectionType } from "../components/insights";

export interface ProjectMeta {
    project_name: string;
    project_title: string;
    description: string;
    description_short?: string;
    tags?: {
        [tag_name: string]: string;
    };
    kind: 'model' | 'analytics' | 'interactive';
    allow_feedback?: boolean;
}

// Generic "Insights" structure used by both Models and Analytics
export interface ProjectInsights {
    content: SectionType[];
}

export type ModelInsightsType = ProjectInsights;
export type AnalyticsInsightsType = ProjectInsights;


