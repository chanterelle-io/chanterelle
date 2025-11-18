import { Table2 } from "lucide-react";
import { BaseItem } from "./BaseItem";

// Data type
export interface TableData {
    columns: TableColumn[];
    rows: Record<string, string | number>[];
}

export interface TableColumn {
    header: string;
    field: string;
}

// Item type
export interface TableItem extends BaseItem {
    // type: 'table';
    data: TableData;
}

// Component
export const TableComponent: React.FC<TableItem> = ({ data }) => (
    <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-gray-300 dark:border-slate-600 rounded">
            <thead className="bg-gray-100 dark:bg-slate-700">
                <tr>
                    {data.columns.map((col) => (
                        <th
                            key={col.field}
                            className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left dark:text-slate-200"
                        >
                            {col.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800">
                {data.rows.map((row, i) => (
                    <tr key={i}>
                        {data.columns.map((col) => (
                            <td
                                key={col.field}
                                className="border border-gray-300 dark:border-slate-600 px-3 py-2 dark:text-slate-200"
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

// Icon
export const TableIcon: React.FC = () => (
    <Table2 className="inline-block w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />
);

// // Register component
// componentRegistry.set('table', {
//     Component: TableComponent,
//     icon: TableIcon
// });