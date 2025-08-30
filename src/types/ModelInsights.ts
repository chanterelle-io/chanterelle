import { SectionType } from "../components/insights";

export interface ModelInsights {
//   model_id: string;
//   version: string;
  content: SectionType[];
  model_folder_url?: string;
  signed_url_base?: string;
  signed_url_params?: string;
}


