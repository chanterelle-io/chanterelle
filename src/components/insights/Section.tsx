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
    id?: string;
    title?: string;
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
    index?: number;
}

export const SectionComponent: React.FC<SectionComponentProps> = ({
    section,
    level = 1,
    parentId = "",
    index
}) => {
    const hasTitle = Boolean(section.title);

    const slugify = (value: string) =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const localId =
        section.id ||
        (section.title
            ? slugify(section.title)
            : typeof index === 'number'
                ? `section-${index}`
                : 'section');
    const sectionId = parentId ? `${parentId}__${localId}` : localId;
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
                return 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700';
            case 'green':
                return 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700';
            case 'blue':
                return 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
            case 'yellow':
                return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
            case 'purple':
                return 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
            case 'orange':
                return 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
            case 'white':
            default:
                return 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600';
        }
    };

    return (
        <div className={`${hasTitle ? `p-4 border rounded-lg mb-4 ${getColorClasses(section.color)}` : ''}`}>
            {section.title && (
                <div className={headingClass}>
                    <h2 className="flex-1">{section.title}</h2>
                </div>
            )}
            
            {section.description && (
                <p className="mb-3 text-gray-600 dark:text-gray-300">{section.description}</p>
            )}

            {/* Dropdown for subsections */}
            {section.dropdown && section.dropdown.enabled && (
                <div className="mb-4">
                    <select
                        value={selectedOption}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    >
                        {section.dropdown.options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {section.dropdown.options.find(opt => opt.id === selectedOption)?.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                    {itemsToRender.map((item, index) => 
                        renderSectionOrItem(item, level, sectionId, index)
                    )}
                </div>
            )}

            {section.comment && (
                <div className="text-m text-gray-800 dark:text-gray-300 mt-3">{section.comment}</div>
            )}
        </div>
    )
};

// Recursive item renderer
export const renderSectionOrItem = (item: SectionOrItemType, level = 1, parentId = "", index = 0): JSX.Element | null => {
    if (!item) return null;
    const slugify = (value: string) =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const localId = item.id || (item.title ? slugify(item.title) : `item-${index}`);
    const itemId = parentId ? `${parentId}__${localId}` : localId;

    if (item.type === "section") {
        // Type guard to ensure item is SectionType
        return (
            <SectionComponent
                key={localId}
                section={{...item, id: localId} as SectionType}
                level={level + 1}
                parentId={parentId}
                index={index}
            />
        );
    } else {
        // Type guard to ensure item is ItemType
        // const itemData = item as ItemType;
        const IconComponent = componentRegistry[item.type]?.icon;
        const DataComponent = componentRegistry[item.type]?.Component;
        
        return (
            <div key={localId} id={itemId} className="" data-toc>
                {(item.title || item.description) && (
                    <div className="mb-3">
                        {item.title && (
                            <h4 className="text-lg font-semibold mb-1 flex items-center">
                                {IconComponent && <IconComponent />}
                                {item.title}
                            </h4>
                        )}
                        {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                        )}
                    </div>
                )}
                <div className="">
                    {DataComponent && <DataComponent { ...item } />}
                </div>
                {item.comment && (
                    <div className="text-sm italic text-gray-800 dark:text-gray-300">{item.comment}</div>
                )}
            </div>
        );
    }
};