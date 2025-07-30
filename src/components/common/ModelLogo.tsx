// different icons for different model.outputType
import React from "react";
import { Brain, Shapes, Hash } from "lucide-react";

// Model Logo Component
interface ModelLogoProps {
    outputType: string;
    size?: number;
}

const ModelLogo: React.FC<ModelLogoProps> = ({ outputType, size }) => {
    return (
        <>
            {outputType === "classification" ? (
                <Shapes className="text-blue-500" size={size} />
            ) : outputType === "regression" ? (
                <Hash className="text-blue-500" size={size} />
            ) : (
                <Brain className="text-blue-500" size={size} />
            )}
        </>
    );
};

export default ModelLogo;