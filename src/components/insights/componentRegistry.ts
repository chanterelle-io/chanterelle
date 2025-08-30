import React from "react";
import type { BaseItem } from "./BaseItem";
import { TableComponent, TableIcon } from "./Table";
import type { TableItem } from "./Table";
import { ImageComponent, ImageInsightIcon } from "./Image";
import type { ImageItem } from "./Image";
import { LineChartComponent, LineChartIcon } from "./LineChart";
import type { LineChartItem } from "./LineChart";
import { BarChartComponent, BarChartIcon } from "./BarChart";
import type { BarChartItem } from "./BarChart";
import { ErrorMessageComponent, ErrorMessageIcon } from "./ErrorMessage";
import type { ErrorMessageItem } from "./ErrorMessage";
import { ScatterPlotComponent, ScatterPlotIcon, ScatterPlotItem } from "./ScatterPlot";
import { TextComponent, TextIcon, TextItem } from "./Text";

// Component registry type - components must accept props that extend BaseItem
export type ComponentRegistryItem<T extends BaseItem = BaseItem> = {
    Component: React.ComponentType<T>;
    icon?: React.ComponentType<any>;
};

export type ComponentRegistry = {
    [type: string]: ComponentRegistryItem<any>;
};

export const componentRegistry: ComponentRegistry = {
    table: {
        Component: TableComponent,
        icon: TableIcon,
    },
    image: {
        Component: ImageComponent,
        icon: ImageInsightIcon,
    },
    error: {
        Component: ErrorMessageComponent,
        icon: ErrorMessageIcon,
    },
    line_chart: {
        Component: LineChartComponent,
        icon: LineChartIcon,
    },
    bar_chart: {
        Component: BarChartComponent,
        icon: BarChartIcon,
    },
    scatter_plot: {
        Component: ScatterPlotComponent,
        icon: ScatterPlotIcon,
    },
    text: {
        Component: TextComponent,
        icon: TextIcon,
    },
};

export type ItemType = TableItem
    | ImageItem
    | TextItem
    | LineChartItem
    | BarChartItem
    | ErrorMessageItem
    | ScatterPlotItem;
