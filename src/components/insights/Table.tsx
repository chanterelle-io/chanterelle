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

// Icon
export const TableIcon: React.FC = () => (
    <Table2 className="inline-block w-4 h-4 mr-1 text-gray-400" />
);

// // Register component
// componentRegistry.set('table', {
//     Component: TableComponent,
//     icon: TableIcon
// });