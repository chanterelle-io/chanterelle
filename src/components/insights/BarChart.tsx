import { ChartColumn } from "lucide-react";
import React from "react";
import { Bar } from "react-chartjs-2";
import { BaseItem } from "./BaseItem";


// Data type
interface BarChartData {
    bars: {
        label: string;
        value: number;
        color?: string;
    }[];
    axis?: {
        x: AxisConfig;
        y: AxisConfig;
    };
    orientation?: 'horizontal' | 'vertical';
}

interface AxisConfig {
    label: string;
    format?: string;
}

// Item type
export interface BarChartItem extends BaseItem {
    // type: 'bar_chart';
    data: BarChartData;
}

// Bar chart renderer
export const BarChartComponent: React.FC<BarChartItem> = ({ data }) => {
    // Early returns: Check for missing or invalid data
    // Check if data exists
    if (!data) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: No data provided for bar chart
            </div>
        );
    }

    // Check if bars exist
    if (!data.bars || !Array.isArray(data.bars)) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: Missing or invalid 'bars' array
            </div>
        );
    }

    // Check if bars is empty
    if (data.bars.length === 0) {
        return (
            <div className="my-4 p-4 text-center text-yellow-600 bg-yellow-50 border border-yellow-200 rounded">
                ⚠️ Warning: No bars provided
            </div>
        );
    }

    // Filter out invalid bars
    const validBars = data.bars.filter(bar => 
        bar && 
        typeof bar.label === 'string' && 
        typeof bar.value === 'number' && 
        !isNaN(bar.value)
    );

    // Check if any valid bars remain after filtering
    if (validBars.length === 0) {
        const invalidBarCount = data.bars.length;
        return (
            <div className="my-4 p-4 text-center text-orange-600 bg-orange-50 border border-orange-200 rounded">
                ⚠️ Warning: Found {invalidBarCount} bar(s) but none contain valid data
                <br />
                <small className="text-gray-600">Each bar needs a string label and a numeric value</small>
            </div>
        );
    }

    // Determine orientation (default to vertical)
    const isHorizontal = data.orientation === 'horizontal';

    const chartData = {
        labels: validBars.map((b) => b.label),
        datasets: [
            {
                label: data.axis?.x?.label || (isHorizontal ? "Values" : "Categories"),
                data: validBars.map((b) => b.value),
                backgroundColor: validBars.map((b) => b.color || "#1976d2"),
                borderColor: validBars.map((b) => b.color || "#1976d2"),
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isHorizontal ? ("y" as const) : ("x" as const),
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
                    text: isHorizontal 
                        ? (data.axis?.x?.label || "Values")
                        : (data.axis?.x?.label || "Categories"),
                },
                ticks: isHorizontal ? {} : { autoSkip: false },
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: isHorizontal 
                        ? (data.axis?.y?.label || "Categories")
                        : (data.axis?.y?.label || "Values"),
                },
                ticks: isHorizontal ? { autoSkip: false } : {},
            },
        },
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* Show axis warning if missing */}
            {(!data.axis || !data.axis.x || !data.axis.y) && (
                <div className="mb-2 p-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded">
                    ℹ️ Info: Using default axis labels (axis configuration missing)
                </div>
            )}
            <div className="w-full max-w-2xl h-96 border border-gray-300 rounded-lg p-4 bg-white">
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
};

// Icon
export const BarChartIcon: React.FC = () => (
    <ChartColumn className="inline-block w-4 h-4 mr-1 text-gray-400" />
);