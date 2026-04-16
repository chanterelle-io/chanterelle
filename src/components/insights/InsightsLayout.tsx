import React from "react";
import { SectionOrItemType, SectionType, SectionComponent } from "./Section";
import { componentRegistry } from "./componentRegistry";

// Helper to generate consistent IDs
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Recursive helper to flatten all items for ToC (sections and all insight items)
function getAllItemsForToc(
  items: SectionOrItemType[] | undefined,
  level = 1,
  parentId = ""
): { id: string; title: string; level: number; type: string }[] {
  let toc: { id: string; title: string; level: number; type: string }[] = [];

  const safeItems = items ?? [];

  safeItems.forEach((item, index) => {
    let localId = item.id;
    if (!localId) {
      localId = item.title
        ? slugify(item.title)
        : (item.type === 'section' ? `section-${index}` : `item-${index}`);
    }

    const itemId = parentId ? `${parentId}__${localId}` : localId;

    if (item.title && itemId) {
      toc.push({ id: itemId, title: item.title, level, type: item.type });
    }
    if (item.type === "section") {
      const section = item as SectionType;
      if (section.dropdown && section.subsections) {
        // Dropdown sections: skip child items in ToC for now
      } else if (section.items) {
        toc = toc.concat(getAllItemsForToc(section.items, level + 1, itemId));
      }
    }
  });

  return toc;
}

interface InsightsLayoutProps {
  content: SectionOrItemType[];
}

const InsightsLayout: React.FC<InsightsLayoutProps> = ({ content }) => {
  const tocSections = getAllItemsForToc(content);

  return (
    <div className="flex">
      {/* Sidebar */}
      {tocSections.length > 0 && (
        <aside className="w-64 flex-shrink-0 sticky top-12 self-start overflow-hidden bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4">
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
      )}
      {/* Main Content */}
      <main className="flex-1 px-4 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
        {content.map((section, idx) => (
          <SectionComponent key={section.id || idx} section={section as SectionType} index={idx} />
        ))}
      </main>
    </div>
  );
};

export default InsightsLayout;
