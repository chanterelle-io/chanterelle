import { ModelInput, ModelInputConstraint } from "../../../types/ModelMeta";

export interface BaseInputProps {
    input: ModelInput;
    value: any;
    constraints?: ModelInputConstraint;
    onChange: (name: string, value: any) => void;
}
