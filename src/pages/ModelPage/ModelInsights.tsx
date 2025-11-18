import React from "react";
import { ModelInsights } from "../../types/ModelInsights";
import { SectionOrItemType, SectionType, SectionComponent } from "../../components/insights";
import { componentRegistry } from "../../components/insights";

// Recursive helper to flatten all items for ToC (sections and all insight items)
function getAllItemsForToc(
  items: SectionOrItemType[],
  level = 1,
  parentId = ""
): { id: string; title: string; level: number; type: string }[] {
  let toc: { id: string; title: string; level: number; type: string }[] = [];
  for (const item of items) {
    // Compose a unique id for anchor navigation
    const itemId = parentId && item.id ? `${parentId}__${item.id}` : item.id || parentId;
    // Only add if there's a title and id
    if (item.title && itemId) {
      toc.push({ id: itemId, title: item.title, level, type: item.type });
    }
    // If section, recurse into its items or subsections
    if (item.type === "section") {
      const section = item as SectionType;
      // Handle sections with dropdown/subsections
      if (section.dropdown && section.subsections) {
        // Add items from all subsections to ToC
        // Object.values(section.subsections).forEach(subsection => {
        //   toc = toc.concat(getAllItemsForToc(subsection.items, level + 1, itemId));
        // });
        continue; // Skip adding section itself, only its items
      }
      // Handle traditional sections with direct items (no dropdown)
      else if (section.items) {
        toc = toc.concat(getAllItemsForToc(section.items, level + 1, itemId));
      }
    }
  }
  return toc;
}

// --- Main page layout ---
interface ModelInsightsPageProps {
  insights: ModelInsights;
}

const ModelInsightsPage: React.FC<ModelInsightsPageProps> = ({ insights }) => {
  // const insights = model
  // Build Table of Content (ToC) from all items in all top-level sections
  const tocSections = getAllItemsForToc(insights.content);
  return (
  <div className="flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 sticky top-0 h-screen overflow-y-auto bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4">
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Table of Contents</h2>
        <ul>
          {tocSections.map((sec) => {
            const IconComponent = componentRegistry[sec.type]?.icon;
            return (
              <li
                key={sec.id}
                style={{ marginLeft: `${(sec.level - 1) * 0.5}rem` }}
                className="mb-2 flex items-center"
              >
                <button
                  onClick={() => {
                    const element = document.getElementById(sec.id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="flex items-center text-blue-700 dark:text-blue-400 text-sm hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
                >
                  {IconComponent && <IconComponent />}
                  {sec.title}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
        <h2 className="text-2xl font-bold mb-6">
            Findings
          {/* Model Insights: {insights.model_id} (v{insights.version}) */}
        </h2>
        {insights.content.map((section) => (
          <SectionComponent key={section.id} section={section} />
        ))}
      </main>
    </div>
  )
};

export default ModelInsightsPage;

