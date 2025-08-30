import React from "react";
import { Scatter } from "react-chartjs-2";
import { ChartScatter  } from "lucide-react";
import { BaseItem } from "./BaseItem";

// Data type
export interface ScatterPlotData {
    datasets: ScatterPlotDataset[];
    axis?: {
        x: AxisConfig;
        y: AxisConfig;
    };
}
export interface ScatterPlotDataset {
    id: string;
    points: ScatterPlotPoint[];
    style?: {
        color?: string;
        size?: number;
        opacity?: number;
    };
}
export interface ScatterPlotPoint {
    x: number;
    y: number;
}
export interface AxisConfig {
    label: string;
    format?: string;
}

// Item type
export interface ScatterPlotItem extends BaseItem {
    // type: 'scatter_plot';
    data: ScatterPlotData;
}

// ScatterPlot Component
export const ScatterPlotComponent: React.FC<ScatterPlotItem> = ({ data }) => {
    // Early returns: Doesn't work ...
    // Check if data exists
    if (!data) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: No data provided for scatter plot
            </div>
        );
    }

    // Check if datasets exist
    if (!data.datasets || !Array.isArray(data.datasets)) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: Missing or invalid 'datasets' array
            </div>
        );
    }

    // Check if datasets is empty
    if (data.datasets.length === 0) {
        return (
            <div className="my-4 p-4 text-center text-yellow-600 bg-yellow-50 border border-yellow-200 rounded">
                ⚠️ Warning: No datasets provided
            </div>
        );
    }

    // Filter out invalid datasets and points
    const validDatasets = data.datasets.filter(dataset => 
        dataset && 
        dataset.points && 
        Array.isArray(dataset.points) && 
        dataset.points.length > 0
    );

    // Check if any valid datasets remain after filtering
    if (validDatasets.length === 0) {
        const invalidDatasetCount = data.datasets.length;
        return (
            <div className="my-4 p-4 text-center text-orange-600 bg-orange-50 border border-orange-200 rounded">
                ⚠️ Warning: Found {invalidDatasetCount} dataset(s) but none contain valid data points
                <br />
                <small className="text-gray-600">Each dataset needs an array of points with x,y coordinates</small>
            </div>
        );
    }

    const chartData = {
        datasets: validDatasets.map((dataset) => ({
            label: dataset.id || 'Unnamed Dataset',
            data: dataset.points
                .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
                .map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: dataset.style?.color || "#1976d2",
            borderColor: dataset.style?.color || "#1976d2",
            pointRadius: dataset.style?.size || 4,
            pointHoverRadius: (dataset.style?.size || 4) + 2,
            pointBackgroundColor: dataset.style?.color || "#1976d2",
            pointBorderColor: dataset.style?.color || "#1976d2",
            pointBorderWidth: 1,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: data.axis?.x?.label || "X Axis",
                },
                type: 'linear' as const,
                position: 'bottom' as const,
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: data.axis?.y?.label || "Y Axis",
                },
            },
        },
    };

    return (
        <div className="w-full flex justify-center">
            {/* Conditional warnings in main return: works but ...  */}
            {/* Show axis warning if missing */}
            {(!data.axis || !data.axis.x || !data.axis.y) && (
                <div className="mb-2 p-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded">
                    ℹ️ Info: Using default axis labels (axis configuration missing)
                </div>
            )}
            <div className="w-full max-w-2xl h-96 border border-gray-300 rounded-lg p-4 bg-white">
                <Scatter data={chartData} options={options} />
            </div>
        </div>
    );
};

// Icon
export const ScatterPlotIcon: React.FC = () => (
    <ChartScatter  className="inline-block w-4 h-4 mr-1 text-gray-400" />
);