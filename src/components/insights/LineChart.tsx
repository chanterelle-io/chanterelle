import React from "react";
import { Line } from "react-chartjs-2";
import { ChartLine } from "lucide-react";
import { BaseItem } from "./BaseItem";

// Data type
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
    const chartData = {
        labels: data.lines[0]?.points.map((p) => p.x),
        datasets: data.lines.map((line) => ({
            label: line.id,
            data: line.points.map((p) => p.y),
            borderColor: line.style?.color || "#1976d2",
            borderWidth: line.style?.width || 2,
            borderDash: line.style?.dash || [],
            fill: false,
            tension: 0.4,
            pointRadius: 2,
        })),
    };

    const options = {
        responsive: true,
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
                    text: data.axis.x.label ? data.axis.x.label : "X Axis",
                },
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: data.axis.y.label ? data.axis.y.label : "Y Axis",
                },
            },
        },
    };

    return (
        <div className="my-4">
            <Line data={chartData} options={options} />
        </div>
    );
};

// Icon
export const LineChartIcon: React.FC = () => (
    <ChartLine className="inline-block w-4 h-4 mr-1 text-gray-400" />
);