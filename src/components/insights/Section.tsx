import React, { useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

import { componentRegistry } from "./componentRegistry";
import type { ItemType } from "./componentRegistry";


// Section type for all insight sections
export interface SectionType {
    type: 'section';
    color?: 'white' | 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange'; // Optional: color for section header
    id: string;
    title: string;
    description?: string;
    items?: SectionOrItemType[]; // Optional: array of items or subsections
    items_per_row?: number; // Optional: number of items to display per row (default: 1)
    dropdown?: DropdownConfig; // dropdown configuration
    subsections?: Record<string, Subsection>; // New subsections for dropdown content
    comment?: string;
}

// // Item type for all insight items
// export type ItemType = {
//     type: string;
//     id: string;
//     title: string;
//     description?: string;
//     comment?: string;
//     data: Object; // Generic data type for flexibility
//     caption?: string;
// }

// Union type for section or item
export type SectionOrItemType = ItemType | SectionType;

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
    items: SectionOrItemType[];
    items_per_row?: number; // Optional: number of items to display per row (default: 1)
}

// Props for each section insight
interface SectionComponentProps {
    section: SectionType;
    level?: number;
    parentId?: string;
}

export const SectionComponent: React.FC<SectionComponentProps> = ({
    section,
    level = 1,
    parentId = ""
}) => {
    const sectionId = parentId ? `${parentId}__${section.id}` : section.id;
    const headingClass =
        level === 1
            ? "text-xl font-bold mb-2 flex items-center"
            : level === 2
                ? "text-lg font-bold mb-2 flex items-center"
                : "text-base font-bold mb-2 flex items-center";

    // State for dropdown selection
    const [selectedOption, setSelectedOption] = useState(
        section.dropdown?.default_selection || ""
    );

    // Get items to render based on section type
    const getItemsToRender = (): SectionOrItemType[] => {
        if (section.dropdown && section.subsections) {
            // Dropdown-enabled section
            const subsection = section.subsections[selectedOption];
            return subsection?.items || [];
        } else {
            // Traditional section
            return section.items || [];
        }
    };

    // Get items per row configuration
    const getItemsPerRow = (): number => {
        if (section.dropdown && section.subsections) {
            // Dropdown-enabled section
            const subsection = section.subsections[selectedOption];
            return subsection?.items_per_row || 1;
        } else {
            // Traditional section
            return section.items_per_row || 1;
        }
    };

    const itemsToRender = getItemsToRender();
    const itemsPerRow = getItemsPerRow();

    // Generate color classes based on section.color
    const getColorClasses = (color?: string) => {
        switch (color) {
            case 'red':
                return 'bg-red-50 border-red-300';
            case 'green':
                return 'bg-green-50 border-green-300';
            case 'blue':
                return 'bg-blue-50 border-blue-300';
            case 'yellow':
                return 'bg-yellow-50 border-yellow-300';
            case 'purple':
                return 'bg-purple-50 border-purple-300';
            case 'orange':
                return 'bg-orange-50 border-orange-300';
            case 'white':
            default:
                return 'bg-white border-gray-300';
        }
    };

    return (
        <div className={`p-4 border rounded-lg mb-4 ${getColorClasses(section.color)}`}>
            <div className={headingClass}>
                <h2 className="flex-1">{section.title}</h2>
            </div>
            
            {section.description && (
                <p className="mb-3 text-gray-600">{section.description}</p>
            )}

            {/* Dropdown for subsections */}
            {section.dropdown && section.dropdown.enabled && (
                <div className="mb-4">
                    <select
                        value={selectedOption}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2"
                    >
                        {section.dropdown.options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {section.dropdown.options.find(opt => opt.id === selectedOption)?.description && (
                        <p className="text-sm text-gray-500 mt-1">
                            {section.dropdown.options.find(opt => opt.id === selectedOption)?.description}
                        </p>
                    )}
                </div>
            )}

            {/* Render items */}
            {itemsToRender.length > 0 && (
                <div 
                    className={`grid gap-4`}
                    style={{ gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)` }}
                >
                    {itemsToRender.map((item) => 
                        renderSectionOrItem(item, level, sectionId)
                    )}
                </div>
            )}

            {section.comment && (
                <div className="text-m text-gray-800 mt-3">{section.comment}</div>
            )}
        </div>
    )
};

// Recursive item renderer
export const renderSectionOrItem = (item: SectionOrItemType, level = 1, parentId = ""): JSX.Element | null => {
    const itemId = parentId && item.id ? `${parentId}__${item.id}` : item.id || parentId;
    if (item.type === "section") {
        // Type guard to ensure item is SectionType
        return (
            <SectionComponent
                key={item.id}
                section={item as SectionType}
                level={level + 1}
                parentId={parentId}
            />
        );
    } else {
        // Type guard to ensure item is ItemType
        // const itemData = item as ItemType;
        const IconComponent = componentRegistry[item.type]?.icon;
        const DataComponent = componentRegistry[item.type]?.Component;
        
        return (
            <div key={item.id} id={itemId} className="mb-2 p-2" data-toc>
                <div className="mb-3">
                    <h4 className="text-lg font-semibold mb-1 flex items-center">
                        {IconComponent && <IconComponent />}
                        {item.title}
                    </h4>
                    {item.description && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                </div>
                <div className="mb-3">
                    {DataComponent && <DataComponent { ...item } />}
                </div>
                {item.comment && (
                    <div className="text-sm italic text-gray-800">{item.comment}</div>
                )}
            </div>
        );
    }
};