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
        <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-2">
            <p className="text-red-700 font-medium leading-relaxed">{error}</p>
          </div>
    );
};

// Icon
export const ErrorMessageIcon: React.FC = () => {
    return <AlertTriangle className="inline-block w-5 h-5 mr-2" />;
};
