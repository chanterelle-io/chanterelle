import React from "react";
import { BaseInputProps } from "./types";
import { TextInput } from "./TextInput";
import { NumberInput } from "./NumberInput";
import { SelectInput } from "./SelectInput";
import { CheckboxInput } from "./CheckboxInput";
import { TextAreaInput } from "./TextAreaInput";
import { FileInput } from "./FileInput";
import { ButtonInput } from "./ButtonInput";
import { YesNoInput } from "./YesNoInput";
import { ModelInput, ModelInputConstraint } from "../../../types/ModelMeta";

export type InputComponent = React.FC<BaseInputProps>;

export interface InputDefinition {
    component: InputComponent;
    getDefaultValue: (input: ModelInput) => any;
    validate?: (value: any, input: ModelInput, constraints?: ModelInputConstraint) => string | null;
    processValue?: (value: any, input: ModelInput) => any;
}

const defaultValidator = (value: any, input: ModelInput, constraints?: ModelInputConstraint): string | null => {
    if (input.required) {
        if (!value && value !== 0 && value !== false) {
            return `Field "${input.label || input.name}" is required.`;
        }
    }
    
    const effectiveConstraints = constraints || input.constraints;

    if (effectiveConstraints?.regex && value && !new RegExp(effectiveConstraints.regex).test(value)) {
        return `Field "${input.label || input.name}" does not match the required pattern.`;
    }
    return null;
};

// We need a validator signature that accepts effective constraints if we want to be fully correct,
// but the interface above has `input: ModelInput`. 
// I'll update the interface to accept `constraints?: ModelInputConstraint`.

const fileValidator = (value: any, input: ModelInput): string | null => {
    if (input.required) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return `File "${input.label || input.name}" is required.`;
        }
    }
    return null;
};

export const inputRegistry: Record<string, InputDefinition> = {
    string: {
        component: TextInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
    },
    int: {
        component: NumberInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
        processValue: (value) => {
            if (value === "") return value;
            const num = parseInt(value, 10);
            return isNaN(num) ? value : num;
        }
    },
    float: {
        component: NumberInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
        processValue: (value) => {
            if (value === "") return value;
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        }
    },
    category: {
        component: SelectInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
    },
    boolean: {
        component: CheckboxInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : false,
        validate: defaultValidator, // Usually bools are always valid if boolean type
    },
    textarea: {
        component: TextAreaInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
    },
    file: {
        component: FileInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : null,
        validate: fileValidator,
        processValue: (value) => {
            if (!value) return value;
            if (Array.isArray(value)) {
                return value.map((file: any) => ({
                    name: file.name,
                    path: file.path
                }));
            } else if (typeof value === 'object') {
                return {
                    name: value.name,
                    path: value.path
                };
            }
            return value;
        }
    },
    button: {
        component: ButtonInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
    },
    yes_no: {
        component: YesNoInput,
        getDefaultValue: (input) => input.default !== undefined ? input.default : "",
        validate: defaultValidator,
    },
};

export const getInputDefinition = (type: string): InputDefinition | null => {
    return inputRegistry[type] || null;
};

export const getInputComponent = (type: string): InputComponent | null => {
    return inputRegistry[type]?.component || null;
};
