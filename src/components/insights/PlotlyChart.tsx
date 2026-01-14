import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Activity } from 'lucide-react';
import { BaseItem } from './BaseItem';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useProjectContext } from '../../contexts/ProjectContext';

// Define the Plotly data types
// We use 'any' for the plotly types here to avoid complex type dependencies 
// if @types/plotly.js isn't perfectly aligned, but ideally we'd use Plotly.Data[]
export interface PlotlyItem extends BaseItem {
    // type: 'plotly';
    // Can be either Plotly traces array or a JSON string (e.g. fig.to_json()) or a figure-like object.
    data?: any[] | string | unknown;
    file_path?: string;
    // Alternative inline figure fields (useful when you don't want to write a file)
    figure?: unknown;
    figure_json?: string;
    layout?: any;
    config?: any;
}

type NormalizedPlotlyFigure = {
    data?: any[];
    layout?: any;
    config?: any;
};

const unwrapJsonStrings = (value: unknown, maxDepth = 4): unknown => {
    let current: unknown = value;

    for (let depth = 0; depth < maxDepth; depth++) {
        if (typeof current !== 'string') break;

        const trimmed = current.trim();
        if (!trimmed) break;

        // We only attempt JSON.parse when it plausibly is JSON (object/array/string).
        const firstChar = trimmed[0];
        const looksLikeJson = firstChar === '{' || firstChar === '[' || firstChar === '"';
        if (!looksLikeJson) break;

        try {
            const parsed = JSON.parse(trimmed);
            if (parsed === current) break;
            current = parsed;
        } catch {
            break;
        }
    }

    return current;
};

const normalizePlotlyFigure = (raw: unknown): NormalizedPlotlyFigure => {
    const value = unwrapJsonStrings(raw);

    // Plotly python sometimes nests the figure under "figure" or "fig"
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const maybeFigure = (value as any).figure ?? (value as any).fig;
        if (maybeFigure) {
            return normalizePlotlyFigure(maybeFigure);
        }
    }

    // Most common: { data: [...], layout: {...}, config?: {...} }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as any;

        const parsedData = unwrapJsonStrings(obj.data);
        const parsedLayout = unwrapJsonStrings(obj.layout);
        const parsedConfig = unwrapJsonStrings(obj.config);

        if (Array.isArray(parsedData)) {
            return {
                data: parsedData,
                layout: parsedLayout && typeof parsedLayout === 'object' ? parsedLayout : obj.layout,
                config: parsedConfig && typeof parsedConfig === 'object' ? parsedConfig : obj.config,
            };
        }

        // Some exports use "traces" instead of "data"
        const parsedTraces = unwrapJsonStrings(obj.traces);
        if (Array.isArray(parsedTraces)) {
            return {
                data: parsedTraces,
                layout: parsedLayout && typeof parsedLayout === 'object' ? parsedLayout : obj.layout,
                config: parsedConfig && typeof parsedConfig === 'object' ? parsedConfig : obj.config,
            };
        }

        // Single trace object without wrapper
        if (obj.type || (obj.x && obj.y)) {
            return {
                data: [obj],
                layout: obj.layout,
                config: obj.config,
            };
        }

        // Plotly.js "Figure" from some sources can be {"data": { ... }} where data is not an array
        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
            return {
                data: [parsedData],
                layout: parsedLayout && typeof parsedLayout === 'object' ? parsedLayout : obj.layout,
                config: parsedConfig && typeof parsedConfig === 'object' ? parsedConfig : obj.config,
            };
        }
    }

    // Raw array of traces
    if (Array.isArray(value)) {
        return { data: value };
    }

    // Raw single trace
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as any;
        if (obj.type || (obj.x && obj.y)) {
            return { data: [obj] };
        }
    }

    return {};
};

// Helper function to get the correct source with cache busting (consistent with Image.tsx and Html.tsx)
const requestResourceSrc = (filePath: string, projectDir: string) => {
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
      
      return converted + `?t=${Date.now()}`;
    }
    
    // If it's a Windows absolute path (C:\...), convert it directly
    if (isWindows && filePath.match(/^[A-Za-z]:\\/)) {
      return convertFileSrc(filePath) + `?t=${Date.now()}`;
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
    return convertFileSrc(fullPath) + `?t=${Date.now()}`;
  } catch (error) {
    console.error('Error converting file path:', error);
    return filePath; // fallback to original
  }
};

export const PlotlyComponent: React.FC<PlotlyItem> = (item) => {
    const { projectPath } = useProjectContext();
    const [fetchedData, setFetchedData] = useState<any[] | undefined>(undefined);
    const [fetchedLayout, setFetchedLayout] = useState<any | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const inlineFigure = normalizePlotlyFigure(
        item.figure_json ?? item.figure ?? item.data
    );

    useEffect(() => {
        const loadData = async () => {
            if (item.file_path && projectPath) {
                setLoading(true);
                setError(undefined);
                try {
                    const url = requestResourceSrc(item.file_path, projectPath);
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to load data from ${item.file_path}`);
                    }
                    const raw = await response.json();
                    const figure = normalizePlotlyFigure(raw);

                    if (figure.data && Array.isArray(figure.data) && figure.data.length > 0) {
                        setFetchedData(figure.data);
                        if (figure.layout) setFetchedLayout(figure.layout);
                    } else {
                        const rawType = typeof raw;
                        const topKeys = raw && typeof raw === 'object' && !Array.isArray(raw)
                            ? Object.keys(raw as any).slice(0, 12).join(', ')
                            : '';

                        console.warn('Unknown/empty JSON structure for Plotly chart', raw);
                        throw new Error(
                            `Loaded ${item.file_path} but found no Plotly traces. ` +
                            `Expected {data:[...]}, an array of traces, or a double-encoded JSON string. ` +
                            (rawType === 'object' && topKeys ? `Top-level keys: ${topKeys}` : `Type: ${rawType}`)
                        );
                    }
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error loading chart data');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };

        if (item.file_path) {
            loadData();
            return;
        }

        // No file path: use inline data/figure payload if present.
        const hasInlinePayload =
            item.figure_json != null || item.figure != null || item.data != null;

        if (hasInlinePayload) {
            if (inlineFigure.data && Array.isArray(inlineFigure.data) && inlineFigure.data.length > 0) {
                setFetchedData(inlineFigure.data);
                if (inlineFigure.layout) setFetchedLayout(inlineFigure.layout);
                setError(undefined);
            } else if (Array.isArray(item.data) && item.data.length > 0) {
                // Back-compat: if user provides traces directly.
                setFetchedData(item.data);
                setError(undefined);
            } else {
                setFetchedData(undefined);
                setFetchedLayout(undefined);
                setError(
                    'Plotly payload provided inline, but no traces were found. ' +
                    'Provide an array of traces, or a figure JSON like fig.to_json() that contains {"data": [...]}. '
                );
            }
        }
    }, [item.file_path, projectPath]);

    if (error) {
        return <div className="text-red-500 p-4 border border-red-200 rounded">Error loading chart: {error}</div>;
    }

    if (loading) {
         return <div className="p-4 text-gray-500 animate-pulse">Loading chart data...</div>;
    }

    const data = fetchedData || [];
    const layout = {
        autosize: true, 
        margin: { t: 40, r: 20, l: 40, b: 40 },
        ...(fetchedLayout || {}),
        ...(inlineFigure.layout || {}),
        ...item.layout
    };

    return (
        <div className="w-full flex justify-center p-2 bg-white rounded-lg border border-gray-200" style={{ minHeight: "450px" }}>
            <Plot
                data={data}
                layout={layout}
                config={{
                    responsive: true, 
                    displayModeBar: true,
                    ...(inlineFigure.config || {}),
                    ...item.config
                }}
                style={{width: "100%", height: "100%"}}
                useResizeHandler={true}
                className="w-full h-full"
            />
        </div>
    );
};

export const PlotlyIcon: React.FC = () => (
    <Activity className="inline-block w-4 h-4 mr-1 text-gray-400" />
);
