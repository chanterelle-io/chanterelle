import React from "react";
import { ImageIcon } from "lucide-react";
import { BaseItem } from "./BaseItem";
import { convertFileSrc } from '@tauri-apps/api/core';
import { useProjectContext } from "../../contexts/ProjectContext";

// Data type for Image
export interface ImageItem extends BaseItem {
    // type: 'image';
    file_path: string;
    caption?: string;
}

// Helper function to get the correct image source
const getImageSrc = (filePath: string, projectDir: string) => {
  try {
    console.log('Processing image URL:', filePath);

    // If it's already a valid HTTP/HTTPS URL, use it as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      console.log('Using HTTP/HTTPS URL as-is');
      return filePath;
    }
    
    // If it's a file:// URL, we need to clean it up first
    if (filePath.startsWith('file://')) {
      console.log('Processing file:// URL');
      
      // Decode the URL to get the actual file path
      let decodedPath = decodeURIComponent(filePath);
      console.log('Decoded path:', decodedPath);
      
      // Remove the file:// prefix and get just the path
      let extractedPath = decodedPath.replace('file:///', '').replace('file://', '');
      console.log('Extracted file path:', extractedPath);
      
      // Convert forward slashes back to backslashes for Windows
      extractedPath = extractedPath.replace(/\//g, '\\');
      console.log('Windows file path:', extractedPath);
      
      // Convert it using Tauri's convertFileSrc
      const converted = convertFileSrc(extractedPath);
      console.log('Converted to:', converted);
      return converted;
    }
    
    // If it's a Windows absolute path (C:\...), convert it directly
    if (filePath.match(/^[A-Za-z]:\\/)) {
      console.log('Converting Windows path directly');
      const converted = convertFileSrc(filePath);
      console.log('Converted to:', converted);
      return converted;
    }
    
    // For relative paths, prepend projectDir
    console.log('Handling relative path with projectDir:', projectDir);
    let fullPath: string;
    
    // Check if it's a relative path (doesn't start with drive letter or protocol)
    if (!filePath.match(/^[A-Za-z]:/) && !filePath.startsWith('/') && !filePath.includes('://')) {
      // It's a relative path, combine with projectDir
      const separator = projectDir.endsWith('\\') || projectDir.endsWith('/') ? '' : '\\';
      fullPath = projectDir + separator + filePath.replace(/\//g, '\\');
      console.log('Combined relative path:', fullPath);
    } else {
      fullPath = filePath;
    }
    
    // Convert it using Tauri's convertFileSrc
    const converted = convertFileSrc(fullPath);
    console.log('Converted to:', converted);
    return converted;
  } catch (error) {
    console.error('Error converting file path:', error);
    return filePath; // fallback to original
  }
};

// Image Component
export const ImageComponent: React.FC<ImageItem> = (item) => {
    const { projectPath } = useProjectContext();
    return (
        <div className="w-full flex justify-center">
            <div className="w-fit border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                <img
                    src={getImageSrc(item.file_path, projectPath ?? "")}
                    alt={item.caption || item.file_path}
                    className="max-h-[65vh] w-full max-w-[80vh] object-contain"
                    onLoad={() => {
                    console.log('Image loaded successfully');
                    }}
                    onError={(e) => {
                    console.error('Failed to load image:', e);
                    console.log('Failed src:', getImageSrc(item.file_path, projectPath ?? ""));
                    }}
              />
            </div>
        </div>
    );
};

// Icon for Image
export const ImageInsightIcon: React.FC = () => (
    <ImageIcon className="inline-block w-4 h-4 mr-1 text-gray-400" />
);
