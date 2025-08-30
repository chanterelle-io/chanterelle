import React from "react";
import { Line } from "react-chartjs-2";
import { ChartLine } from "lucide-react";
import { BaseItem } from "./BaseItem";

// Data type
export interface LineChartData {
    lines: LineChartLine[];
    axis?: {
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
export interface AxisConfig {
    label: string;
    format?: string;
}

// Item type
export interface LineChartItem extends BaseItem {
    // type: 'line_chart';
    data: LineChartData;
}

// LineChart Component
export const LineChartComponent: React.FC<LineChartItem> = ({ data }) => {
    // Early returns: Check for missing or invalid data
    // Check if data exists
    if (!data) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: No data provided for line chart
            </div>
        );
    }

    // Check if lines exist
    if (!data.lines || !Array.isArray(data.lines)) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: Missing or invalid 'lines' array
            </div>
        );
    }

    // Check if lines is empty
    if (data.lines.length === 0) {
        return (
            <div className="my-4 p-4 text-center text-yellow-600 bg-yellow-50 border border-yellow-200 rounded">
                ⚠️ Warning: No lines provided
            </div>
        );
    }

    // Filter out invalid lines and points
    const validLines = data.lines.filter(line => 
        line && 
        line.points && 
        Array.isArray(line.points) && 
        line.points.length > 0
    );

    // Check if any valid lines remain after filtering
    if (validLines.length === 0) {
        const invalidLineCount = data.lines.length;
        return (
            <div className="my-4 p-4 text-center text-orange-600 bg-orange-50 border border-orange-200 rounded">
                ⚠️ Warning: Found {invalidLineCount} line(s) but none contain valid data points
                <br />
                <small className="text-gray-600">Each line needs an array of points with x,y coordinates</small>
            </div>
        );
    }

    // Generate chart data from valid lines
    const chartData = {
        labels: validLines[0]?.points
            .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
            .map((p) => p.x),
        datasets: validLines.map((line) => ({
            label: line.id || 'Unnamed Line',
            data: line.points
                .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
                .map((p) => p.y),
            color: line.style?.color || "#1976d2",
            borderColor: line.style?.color || "#1976d2",
            backgroundColor: line.style?.color || "#1976d2",
            borderWidth: line.style?.width || 2,
            borderDash: line.style?.dash || [],
            fill: false,
            tension: 0.4,
            pointRadius: 2,
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
            {/* Show axis warning if missing */}
            {(!data.axis || !data.axis.x || !data.axis.y) && (
                <div className="mb-2 p-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded">
                    ℹ️ Info: Using default axis labels (axis configuration missing)
                </div>
            )}
            <div className="w-full max-w-2xl h-96 border border-gray-300 rounded-lg p-4 bg-white">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

// Icon
export const LineChartIcon: React.FC = () => (
    <ChartLine className="inline-block w-4 h-4 mr-1 text-gray-400" />
);