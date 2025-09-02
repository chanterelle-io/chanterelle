import React from "react";
import { Text  } from "lucide-react";
import { BaseItem } from "./BaseItem";

// Data type
export interface TextData {
    content: TextContent[];
    style?: {
        fontSize?: 'small' | 'medium' | 'large';
        fontWeight?: 'normal' | 'bold';
        alignment?: 'left' | 'center' | 'right' | 'justify';
    };
}

export interface TextContent {
    id: string;
    type: 'paragraph' | 'bullet_list';
    text: string;
    style?: {
        color?: string;
        backgroundColor?: string;
        fontSize?: 'small' | 'medium' | 'large';
        fontWeight?: 'normal' | 'bold';
        italic?: boolean;
    };
    bulletPoints?: BulletPoint[];
}

export interface BulletPoint {
    text: string;
    style?: {
        color?: string;
        backgroundColor?: string;
        fontSize?: 'small' | 'medium' | 'large';
        fontWeight?: 'normal' | 'bold';
        italic?: boolean;
    };
    nested?: BulletPoint[];
}

// Item type
// export interface TextItem extends BaseItem {
//     // type: 'text';
//     data: TextData;
// }
export type TextItem = BaseItem & TextData;

// Text Component
export const TextComponent: React.FC<TextItem> = ( data ) => {
    // Early returns: Error handling
    // Check if data exists
    if (!data) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: No data provided for text component
            </div>
        );
    }

    // Check if content exists
    if (!data.content || !Array.isArray(data.content)) {
        return (
            <div className="my-4 p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded">
                ❌ Error: Missing or invalid 'content' array
            </div>
        );
    }

    // Check if content is empty
    if (data.content.length === 0) {
        return (
            <div className="my-4 p-4 text-center text-yellow-600 bg-yellow-50 border border-yellow-200 rounded">
                ⚠️ Warning: No content provided
            </div>
        );
    }

    // Filter out invalid content items
    const validContent = data.content.filter(item => 
        item && 
        item.text && 
        typeof item.text === 'string' && 
        item.text.trim().length > 0
    );

    // Check if any valid content remains after filtering
    if (validContent.length === 0) {
        const invalidContentCount = data.content.length;
        return (
            <div className="my-4 p-4 text-center text-orange-600 bg-orange-50 border border-orange-200 rounded">
                ⚠️ Warning: Found {invalidContentCount} content item(s) but none contain valid text
                <br />
                <small className="text-gray-600">Each content item needs a non-empty text property</small>
            </div>
        );
    }

    // Helper function to get font size class
    const getFontSizeClass = (size?: 'small' | 'medium' | 'large') => {
        switch (size) {
            case 'small': return 'text-sm';
            case 'large': return 'text-lg';
            default: return 'text-base';
        }
    };

    // Helper function to get font weight class
    const getFontWeightClass = (weight?: 'normal' | 'bold') => {
        return weight === 'bold' ? 'font-bold' : 'font-normal';
    };

    // Helper function to get alignment class
    const getAlignmentClass = (alignment?: 'left' | 'center' | 'right' | 'justify') => {
        switch (alignment) {
            case 'center': return 'text-center';
            case 'right': return 'text-right';
            case 'justify': return 'text-justify';
            default: return 'text-left';
        }
    };

    // Helper function to build inline styles
    const buildInlineStyle = (style?: TextContent['style'] | BulletPoint['style']) => {
        if (!style) return {};
        
        const inlineStyle: React.CSSProperties = {};
        
        if (style.color) inlineStyle.color = style.color;
        if (style.backgroundColor) inlineStyle.backgroundColor = style.backgroundColor;
        if (style.italic) inlineStyle.fontStyle = 'italic';
        
        return inlineStyle;
    };

    // Helper function to render bullet points
    const renderBulletPoints = (bulletPoints: BulletPoint[], level: number = 0) => {
        return (
            <ul className={`${level === 0 ? 'list-disc' : 'list-circle'} ml-6 space-y-1`}>
                {bulletPoints.map((bullet, index) => (
                    <li key={index} className="leading-relaxed">
                        <span
                            className={`
                                ${getFontSizeClass(bullet.style?.fontSize)}
                                ${getFontWeightClass(bullet.style?.fontWeight)}
                            `}
                            style={buildInlineStyle(bullet.style)}
                        >
                            {bullet.text}
                        </span>
                        {bullet.nested && bullet.nested.length > 0 && (
                            <div className="mt-1">
                                {renderBulletPoints(bullet.nested, level + 1)}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    // Main container classes
    const containerClasses = `
        w-full p-4 bg-white border border-gray-200 rounded-lg
        ${getFontSizeClass(data.style?.fontSize)}
        ${getFontWeightClass(data.style?.fontWeight)}
        ${getAlignmentClass(data.style?.alignment)}
    `;

    return (
        <div className="w-full flex justify-center">
            {/* Show style warning if using default styling */}
            {/* {!data.style && (
                <div className="mb-2 p-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded">
                    ℹ️ Info: Using default text styling (style configuration missing)
                </div>
            )} */}
            
            <div className={containerClasses}>
                <div className="space-y-4">
                    {validContent.map((contentItem) => {
                        if (contentItem.type === 'bullet_list') {
                            return (
                                <div key={contentItem.id} className="space-y-2">
                                    {contentItem.text && (
                                        <p
                                            className={`
                                                mb-2 leading-relaxed
                                                ${getFontSizeClass(contentItem.style?.fontSize)}
                                                ${getFontWeightClass(contentItem.style?.fontWeight)}
                                            `}
                                            style={buildInlineStyle(contentItem.style)}
                                        >
                                            {contentItem.text}
                                        </p>
                                    )}
                                    {contentItem.bulletPoints && contentItem.bulletPoints.length > 0 ? (
                                        renderBulletPoints(contentItem.bulletPoints)
                                    ) : (
                                        <div className="text-orange-600 bg-orange-50 border border-orange-200 rounded p-2 text-sm">
                                            ⚠️ Warning: Bullet list type specified but no bullet points provided
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            // Regular paragraph
                            return (
                                <p
                                    key={contentItem.id}
                                    className={`
                                        leading-relaxed
                                        ${getFontSizeClass(contentItem.style?.fontSize)}
                                        ${getFontWeightClass(contentItem.style?.fontWeight)}
                                    `}
                                    style={buildInlineStyle(contentItem.style)}
                                >
                                    {contentItem.text}
                                </p>
                            );
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

// Icon
export const TextIcon: React.FC = () => (
    <Text className="inline-block w-4 h-4 mr-1 text-gray-400" />
);
