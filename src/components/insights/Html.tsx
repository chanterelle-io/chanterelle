import React, { useState, useEffect } from "react";
import { Code } from "lucide-react";
import { BaseItem } from "./BaseItem";
import { convertFileSrc } from '@tauri-apps/api/core';
import { useProjectContext } from "../../contexts/ProjectContext";

// Data type for HTML
export interface HtmlItem extends BaseItem {
    // type: 'html';
    content?: string;
    file_path?: string;
    height?: string;
}

// Helper function to get the correct source with cache busting (reused logic from Image.tsx)
const getResourceSrc = (filePath: string, projectDir: string) => {
  try {
    const isWindows = navigator.userAgent.includes('Windows');

    // If it's already a valid HTTP/HTTPS URL, use it as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // If it's a file:// URL, we need to clean it up first
    if (filePath.startsWith('file://')) {
      // Decode the URL to get the actual file path
      let decodedPath = decodeURIComponent(filePath);
      
      // Remove the file:// prefix
      let extractedPath = decodedPath.replace(/^file:\/\//, '');
      
      // Handle Windows paths like /C:/Users/... -> C:\Users\...
      if (isWindows) {
        if (extractedPath.startsWith('/') && /^\/[A-Za-z]:/.test(extractedPath)) {
            extractedPath = extractedPath.substring(1);
        }
        // Convert forward slashes back to backslashes for Windows
        extractedPath = extractedPath.replace(/\//g, '\\');
      }
      
      // Convert it using Tauri's convertFileSrc
      const converted = convertFileSrc(extractedPath);
      
      // Add cache busting parameter
      const cacheBuster = `?t=${Date.now()}`;
      return converted + cacheBuster;
    }
    
    // If it's a Windows absolute path (C:\...), convert it directly
    if (isWindows && filePath.match(/^[A-Za-z]:\\/)) {
      const converted = convertFileSrc(filePath);
      const cacheBuster = `?t=${Date.now()}`;
      return converted + cacheBuster;
    }
    
    // For relative paths, prepend projectDir
    let fullPath: string;
    
    // Check if it's a relative path
    const isAbsolute = isWindows 
        ? /^[A-Za-z]:/.test(filePath) || filePath.startsWith('\\\\')
        : filePath.startsWith('/');

    if (!isAbsolute && !filePath.includes('://')) {
      // It's a relative path, combine with projectDir
      const separator = isWindows ? '\\' : '/';
      const needsSeparator = !projectDir.endsWith(separator);
      
      let normalizedFilePath = filePath;
      if (isWindows) {
          normalizedFilePath = filePath.replace(/\//g, '\\');
      }
      
      fullPath = projectDir + (needsSeparator ? separator : '') + normalizedFilePath;
    } else {
      fullPath = filePath;
    }
    
    // Convert it using Tauri's convertFileSrc
    const converted = convertFileSrc(fullPath);
    
    // Add cache busting parameter
    const cacheBuster = `?t=${Date.now()}`;
    return converted + cacheBuster;
  } catch (error) {
    console.error('Error converting file path:', error);
    return filePath; // fallback to original
  }
};

// HTML Component
export const HtmlComponent: React.FC<HtmlItem> = (item) => {
    const { projectPath } = useProjectContext();
    const [src, setSrc] = useState<string | undefined>(undefined);
    
    useEffect(() => {
        if (item.file_path && projectPath) {
            setSrc(getResourceSrc(item.file_path, projectPath));
        }
    }, [item.file_path, projectPath]);
    
    const height = item.height || "500px";

    if (item.content) {
        return (
            <div className="w-full border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                <iframe 
                  title={item.title || "HTML content"}
                    srcDoc={item.content}
                    className="w-full block"
                    style={{ height, border: 'none' }}
                    sandbox="allow-scripts allow-popups allow-forms"
                />
            </div>
        );
    }

    if (item.file_path && src) {
        return (
            <div className="w-full border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                 <iframe 
                    title={item.title || "HTML content"}
                    src={src}
                    className="w-full block"
                    style={{ height, border: 'none' }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                 />
            </div>
        );
    }
    
    if (item.file_path && !src) {
         return <div className="p-4 text-gray-500 italic">Loading content...</div>;
    }

    return (
        <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">
            No content or valid file path provided for HTML view.
        </div>
    );
};

// Icon for HTML
export const HtmlIcon: React.FC = () => (
    <Code className="inline-block w-4 h-4 mr-1 text-gray-400" />
);
