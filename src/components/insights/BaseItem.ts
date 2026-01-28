export interface BaseItem {
    type: string;
    id?: string;
    title?: string;
    description?: string;
    comment?: string;
    /**
     * Optional layout hint for renderers (e.g., charts) to use the full available width.
     * When omitted/false, components may apply a max-width for better readability.
     */
    full_width?: boolean;
}


// // Insight item (union of all possible types)
// export type InsightItem =
//   | { type: 'bar_chart'; id: string; title: string; description?: string; comment?: string; data: BarChartData }
//   | { type: 'line_chart'; id: string; title: string; description?: string; comment?: string; data: LineChartData }
//   | { type: 'table'; id: string; title: string; description?: string; comment?: string; data: TableData }
//   | { type: 'bullet_list'; id: string; title: string; description?: string; comment?: string; data: BulletListData }
//   | { type: 'image'; id: string; title: string; description?: string; caption?: string; comment?: string; url_filename: string }
//   | { type: 'text'; id: string; title: string; description?: string; comment?: string; text: string }
//   | { type: 'error'; id: string; title: string; description?: string; comment?: string; error: string }
//   | Section;