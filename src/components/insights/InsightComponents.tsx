// Deprecated!

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
import { Line, Bar } from 'react-chartjs-2';
import { Table2, ChartColumn, ChartLine, List, ImageIcon, AlertTriangle } from "lucide-react";
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  Section,
  InsightItem,
  TableData,
  BarChartData,
  LineChartData,
  BulletListData,
  ModelInsights
} from "../../types/ModelInsights";

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

// **Charts** 
// Table renderer
export const TableInsight: React.FC<{ data: TableData }> = ({ data }) => (
  <div className="overflow-x-auto my-4">
    <table className="min-w-full border border-gray-300 rounded">
      <thead className="bg-gray-100">
        <tr>
          {data.columns.map((col) => (
            <th
              key={col.field}
              className="border border-gray-300 px-3 py-2 text-left"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, i) => (
          <tr key={i}>
            {data.columns.map((col) => (
              <td
                key={col.field}
                className="border border-gray-300 px-3 py-2"
              >
                {row[col.field]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Bar chart renderer
export const BarChartInsight: React.FC<{ data: BarChartData }> = ({ data }) => {
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

// Line chart renderer
export const LineChartInsight: React.FC<{ data: LineChartData }> = ({ data }) => {
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

// Bullet list renderer
export const BulletListInsight: React.FC<{ data: BulletListData }> = ({ data }) => (
  <ul className="list-disc ml-6 my-2">
    {data.bullets.map((b, i) => (
      <li
        key={i}
        className={b.style === "emphasis" ? "font-bold" : "font-normal"}
      >
        {b.text}
      </li>
    ))}
  </ul>
);


// **Helper functions**
// Helper: get icon for item type
export function getItemIcon(type: string) {
  switch (type) {
    case "table":
      return <Table2 className="inline-block w-4 h-4 mr-1 text-gray-400" />;
    case "bar_chart":
      return <ChartColumn className="inline-block w-4 h-4 mr-1 text-gray-400" />;
    case "line_chart":
      return <ChartLine className="inline-block w-4 h-4 mr-1 text-gray-400" />;
    case "bullet_list":
      return <List className="inline-block w-4 h-4 mr-1 text-gray-400" />;
    case "image":
      return <ImageIcon className="inline-block w-4 h-4 mr-1 text-gray-400" />;
    case "text":
      return <span className="inline-block w-4 h-4 mr-1 text-gray-400">T</span>; // Placeholder for text icon
    case "error":
      return <AlertTriangle className="inline-block w-5 h-5 mr-2" />; 
    default:
      return null;
  }
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

// Recursive item renderer
export const renderInsightItem = (item: InsightItem, level = 1, parentId = "", model: ModelInsights, projectDir: string): JSX.Element | null => {
  const itemId = parentId && item.id ? `${parentId}__${item.id}` : item.id || parentId;
  switch (item.type) {
    case "table":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full" data-toc>
          <h4 className="text-lg font-semibold mb-1 flex items-center">
            {getItemIcon(item.type)}
            {item.title}
          </h4>
          {item.description && (
            <p className="mb-2 text-gray-600">{item.description}</p>
          )}
          <TableInsight data={item.data} />
          {item.comment && (
            <div className="text-s italic text-gray-500 mt-1">{item.comment}</div>
          )}
        </div>
      );
    case "bar_chart":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full" data-toc>
          <h4 className="text-lg font-semibold mb-1 flex items-center">
            {getItemIcon(item.type)}
            {item.title}
          </h4>
          {item.description && (
            <p className="mb-2 text-gray-600">{item.description}</p>
          )}
          <BarChartInsight data={item.data} />
          {item.comment && (
            <div className="text-s italic text-gray-500 mt-1">{item.comment}</div>
          )}
        </div>
      );
    case "line_chart":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full" data-toc>
          <h4 className="text-lg font-semibold mb-1 flex items-center">
            {getItemIcon(item.type)}
            {item.title}
          </h4>
          {item.description && (
            <p className="mb-2 text-gray-600">{item.description}</p>
          )}
          <LineChartInsight data={item.data} />
          {item.comment && (
            <div className="text-s italic text-gray-500 mt-1">{item.comment}</div>
          )}
        </div>
      );
    case "bullet_list":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full" data-toc>
          <h4 className="text-lg font-semibold mb-1 flex items-center">
            {getItemIcon(item.type)}
            {item.title}
          </h4>
          {item.description && (
            <p className="mb-2 text-gray-600">{item.description}</p>
          )}
          <BulletListInsight data={item.data} />
          {item.comment && (
            <div className="text-s italic text-gray-500 mt-1">{item.comment}</div>
          )}
        </div>
      );
    case "image":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full" data-toc>
          <h4 className="text-lg font-semibold mb-1 flex items-center">
            {getItemIcon(item.type)}
            {item.title}
          </h4>
          {item.description && (
            <p className="mb-2 text-gray-600">{item.description}</p>
          )}
          <img
            src={getImageSrc(item.url_filename, projectDir)}
            alt={item.caption || item.url_filename}
            className="max-w-full max-h-[30rem] border rounded shadow"
            style={{ objectFit: "contain" }}
            onLoad={() => {
              console.log('Image loaded successfully');
            }}
            onError={(e) => {
              console.error('Failed to load image:', e);
              console.log('Failed src:', getImageSrc(item.url_filename, projectDir));
            }}
          />
          {item.caption && (
            <p className="text-sm text-gray-600 mt-2 italic">{item.caption}</p>
          )}
          {item.comment && (
            <div className="text-s italic text-gray-500 mt-1">{item.comment}</div>
          )}
        </div>
      );
    case "text":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full" data-toc>
          <h4 className="text-lg font-semibold mb-1 flex items-center">
            {getItemIcon(item.type)}
            {item.title}
          </h4>
          {item.description && (
            <p className="mb-2 text-gray-600">{item.description}</p>
          )}
          <p className="text-gray-800 whitespace-pre-wrap">{item.text}</p>
          {item.comment && (
            <div className="text-s italic text-gray-500 mt-1">{item.comment}</div>
          )}
        </div>
      );
    case "error":
      return (
        <div key={item.id} id={itemId} className="mb-6 h-full bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm" data-toc>
          <h4 className="text-lg font-semibold mb-2 flex items-center text-red-800">
            {getItemIcon(item.type)}
            <span className="ml-1">{item.title}</span>
          </h4>
          {item.description && (
            <p className="mb-3 text-gray-700">{item.description}</p>
          )}
          <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-2">
            <div className="text-red-700 font-medium leading-relaxed">{item.error}</div>
          </div>
          {item.comment && (
            <div className="text-sm italic text-gray-600 mt-2 px-2">{item.comment}</div>
          )}
        </div>
      );
    // Handle sections recursively
    case "section":
      return (
        <SectionInsight
          key={item.id}
          section={item}
          level={level + 1}
          parentId={parentId}
          model={model}
          projectDir={projectDir}
        />
      );
    default:
      return null;
  }
};


// **Section Components** 
interface SectionInsightProps {
  section: Section;
  level?: number;
  parentId?: string;
  model: ModelInsights;
  projectDir: string;
}

export const SectionInsight: React.FC<SectionInsightProps> = ({
  section,
  level = 1,
  parentId = "",
  model,
  projectDir,
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
  const getItemsToRender = (): InsightItem[] => {
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
    <section
      className={`mb-4 border px-6 py-3 rounded ${getColorClasses(section.color)}`}
      id={sectionId}
      data-toc
    >
      <h3 className={headingClass}>
        {getItemIcon("section")}
        {section.title}
      </h3>
      {section.description && (
        <p className="mb-3 text-gray-700">{section.description}</p>
      )}
      
      {/* Dropdown for subsection selection */}
      {section.dropdown?.enabled && section.dropdown.options && (
        <div className="mb-4">
          <select
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {section.dropdown.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Show description for selected option */}
          {section.dropdown.options.find(opt => opt.id === selectedOption)?.description && (
            <p className="mt-2 text-sm text-gray-600">
              {section.dropdown.options.find(opt => opt.id === selectedOption)?.description}
            </p>
          )}
        </div>
      )}

      {/* Render items */}
      {itemsPerRow === 1 ? (
        // Single column layout (default behavior)
        itemsToRender.map((item) =>
          renderInsightItem(item, level, sectionId, model, projectDir)
        )
      ) : (
        // Grid layout for multiple items per row
        <div 
          className={`grid gap-4 mb-4 ${
            itemsPerRow === 2 ? 'grid-cols-1 md:grid-cols-2' :
            itemsPerRow === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            itemsPerRow === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {itemsToRender.map((item) => (
            <div key={item.id} className="h-fit">
              {renderInsightItem(item, level, sectionId, model, projectDir)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// Simple sections renderer - just renders sections without sidebar
// This is used in model output view where we don't need the sidebar
interface SectionsRendererProps {
  sections: Section[];
  projectDir: string;
}

export const SectionsRenderer: React.FC<SectionsRendererProps> = ({ sections, projectDir }) => {
  const model: ModelInsights = {
    model_id: "temp",
    version: "1.0",
    content: sections
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <SectionInsight
          key={section.id}
          section={section}
          level={1}
          parentId=""
          model={model}
          projectDir={projectDir}
        />
      ))}
    </div>
  );
};
