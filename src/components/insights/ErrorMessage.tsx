import { AlertTriangle } from "lucide-react";
import { BaseItem } from "./BaseItem";

// Item type
export interface ErrorMessageItem extends BaseItem {
    // type: 'error';
    error: string;
}

// Error message component
export const ErrorMessageComponent: React.FC<ErrorMessageItem> = ({ error }) => {
    return (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md p-3 mb-2">
            <p className="text-red-700 dark:text-red-200 font-medium leading-relaxed">{error}</p>
          </div>
    );
};

// Icon
export const ErrorMessageIcon: React.FC = () => {
    return <AlertTriangle className="inline-block w-5 h-5 mr-2 text-red-600 dark:text-red-400" />;
};
