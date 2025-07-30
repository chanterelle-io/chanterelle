// Visualization types
export type VisualizationType = 
  | 'bar_chart' 
  | 'line_chart' 
  | 'scatter' 
  | 'histogram' 
  | 'heatmap'
  | 'table'
  | 'text'
  | 'bullet_list'
  | 'numbered_list'
  | 'text_section'
  | 'insight_cards'
  | 'grouped_bar_chart'
  | 'image'
  ;

export interface ModelInsights {
  model_id: string;
  version: string;
  content: Section[];
  model_folder_url?: string;
  signed_url_base?: string;
  signed_url_params?: string;
}

// Dropdown configuration for sections
export interface DropdownConfig {
  enabled: boolean;
  default_selection: string;
  options: DropdownOption[];
}

export interface DropdownOption {
  id: string;
  label: string;
  description?: string;
}

// Subsection for dropdown functionality
export interface Subsection {
  items: InsightItem[];
  items_per_row?: number; // Optional: number of items to display per row (default: 1)
}

// Section (updated to support dropdown and subsections)
export interface Section {
  type: 'section';
  color?: 'white' | 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange'; // Optional: color for section header
  id: string;
  title: string;
  description?: string;
  items?: InsightItem[]; // Optional for backward compatibility
  items_per_row?: number; // Optional: number of items to display per row (default: 1)
  dropdown?: DropdownConfig; // New dropdown configuration
  subsections?: Record<string, Subsection>; // New subsections for dropdown content
  comment?: string;
}

// Insight item (union of all possible types)
export type InsightItem =
  | { type: 'bar_chart'; id: string; title: string; description?: string; comment?: string; data: BarChartData }
  | { type: 'line_chart'; id: string; title: string; description?: string; comment?: string; data: LineChartData }
  | { type: 'table'; id: string; title: string; description?: string; comment?: string; data: TableData }
  | { type: 'bullet_list'; id: string; title: string; description?: string; comment?: string; data: BulletListData }
  | { type: 'image'; id: string; title: string; description?: string; caption?: string; comment?: string; url_filename: string }
  | { type: 'text'; id: string; title: string; description?: string; comment?: string; text: string }
  | { type: 'error'; id: string; title: string; description?: string; comment?: string; error: string }
  | Section;


// Bar chart
export interface BarChartData {
  bars: { 
    label: string; 
    value: number;
    color?: string;
  }[];
  axis: {
    x: AxisConfig;
    y: AxisConfig;
  };
}

// Axis config
export interface AxisConfig {
  label: string;
  format?: string;
}

// Line chart
export interface LineChartData {
  lines: LineChartLine[];
  axis: {
    x: AxisConfig;
    y: AxisConfig;
  };
}
export interface LineChartLine {
  id: string;
  points: LineChartPoint[];
  style?: {
    color?: string;
    width?: number;
    dash?: number[];
  };
}
export interface LineChartPoint {
  x: number;
  y: number;
}

// Table
export interface TableData {
  columns: TableColumn[];
  rows: Record<string, string | number>[];
}
export interface TableColumn {
  header: string;
  field: string;
}

// Bullet list
export interface BulletListData {
  bullets: { text: string; style?: string }[];
}

// // Image
// export interface ImageData {
//   url_filename: string;
//   caption?: string;
// }
