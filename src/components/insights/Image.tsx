import React from "react";
import { ImageIcon } from "lucide-react";
import { BaseItem } from "./BaseItem";
import { convertFileSrc } from '@tauri-apps/api/core';
import { useProjectContext } from "../../contexts/ProjectContext";

// Data type for Image
export interface ImageItem extends BaseItem {
    // type: 'image';
    url_filename: string;
    caption?: string;
}

// Helper function to get the correct image source
const getImageSrc = (urlFilename: string, projectDir: string) => {
  try {
    console.log('Processing image URL:', urlFilename);
    
    // If it's already a valid HTTP/HTTPS URL, use it as-is
    if (urlFilename.startsWith('http://') || urlFilename.startsWith('https://')) {
      console.log('Using HTTP/HTTPS URL as-is');
      return urlFilename;
    }
    
    // If it's a file:// URL, we need to clean it up first
    if (urlFilename.startsWith('file://')) {
      console.log('Processing file:// URL');
      
      // Decode the URL to get the actual file path
      let decodedPath = decodeURIComponent(urlFilename);
      console.log('Decoded path:', decodedPath);
      
      // Remove the file:// prefix and get just the path
      let filePath = decodedPath.replace('file:///', '').replace('file://', '');
      console.log('Extracted file path:', filePath);
      
      // Convert forward slashes back to backslashes for Windows
      filePath = filePath.replace(/\//g, '\\');
      console.log('Windows file path:', filePath);
      
      // Convert it using Tauri's convertFileSrc
      const converted = convertFileSrc(filePath);
      console.log('Converted to:', converted);
      return converted;
    }
    
    // If it's a Windows absolute path (C:\...), convert it directly
    if (urlFilename.match(/^[A-Za-z]:\\/)) {
      console.log('Converting Windows path directly');
      const converted = convertFileSrc(urlFilename);
      console.log('Converted to:', converted);
      return converted;
    }
    
    // For relative paths, prepend projectDir
    console.log('Handling relative path with projectDir:', projectDir);
    let fullPath: string;
    
    // Check if it's a relative path (doesn't start with drive letter or protocol)
    if (!urlFilename.match(/^[A-Za-z]:/) && !urlFilename.startsWith('/') && !urlFilename.includes('://')) {
      // It's a relative path, combine with projectDir
      const separator = projectDir.endsWith('\\') || projectDir.endsWith('/') ? '' : '\\';
      fullPath = projectDir + separator + urlFilename.replace(/\//g, '\\');
      console.log('Combined relative path:', fullPath);
    } else {
      fullPath = urlFilename;
    }
    
    // Convert it using Tauri's convertFileSrc
    const converted = convertFileSrc(fullPath);
    console.log('Converted to:', converted);
    return converted;
  } catch (error) {
    console.error('Error converting file path:', error);
    return urlFilename; // fallback to original
  }
};

// Image Component
export const ImageComponent: React.FC<ImageItem> = (item) => {
    const { projectPath } = useProjectContext();
    return (
        <div className="my-4">
            {/* <img
                src={data.src}
                alt={data.alt || "Insight image"}
                width={data.width}
                height={data.height}
                className={`max-w-full h-auto rounded-lg shadow-sm ${data.className || ""}`}
            />
            {data.caption && (
                <p className="text-sm text-gray-600 mt-2 text-center italic">
                    {data.caption}
                </p>
            )} */}
            <img
                src={getImageSrc(item.url_filename, projectPath ?? "")}
                alt={item.caption || item.url_filename}
                className="max-w-full max-h-[30rem] border rounded shadow"
                // style={{ objectFit: "contain" }}
                onLoad={() => {
                console.log('Image loaded successfully');
                }}
                onError={(e) => {
                console.error('Failed to load image:', e);
                console.log('Failed src:', getImageSrc(item.url_filename, projectPath ?? ""));
                }}
          />
        </div>
    );
};

// Icon for Image
export const ImageInsightIcon: React.FC = () => (
    <ImageIcon className="inline-block w-4 h-4 mr-1 text-gray-400" />
);
