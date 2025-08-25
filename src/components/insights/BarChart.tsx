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
    axis: {
        x: AxisConfig;
        y: AxisConfig;
    };
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
    const chartData = {
        labels: data.bars.map((b) => b.label),
        datasets: [
            {
                label: data.axis.x.label,
                data: data.bars.map((b) => b.value),
                backgroundColor: data.bars.map((b) => b.color || "#1976d2"),
            },
        ],
    };
    return (
        <div className="my-4">
            <Bar
                data={chartData}
                options={{
                    indexAxis: "y",
                    scales: {
                        y: {
                            ticks: { autoSkip: false },
                        },
                    },
                }}
            />
        </div>
    );
};

// Icon
export const BarChartIcon: React.FC = () => (
    <ChartColumn className="inline-block w-4 h-4 mr-1 text-gray-400" />
);