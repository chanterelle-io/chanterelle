// Model Invoke Response
export interface ModelInvokeResponse {
    prediction: Array<string | number | boolean>;
    sensitivity_curves?: SensitivityCurvePred[];
}

// Model Response
export interface ModelResponse {
    model_id: string;
    output: ModelOutput[];
    sensitivity_curves?: SensitivityCurve[];
    error?: string;
    error_code?: string;
    error_message?: string;
}

export interface ModelOutput {
    name: string;
    label: string;
    value: string | number | boolean | Array<string | number>;
    type: 'float' | 'int' | 'string' | 'boolean';
    unit?: string;
    description?: string;
    min?: number;
    max?: number;
    options?: Array<{
        value: string;
        label?: string;
        description?: string;
    }> | string[];
}

export interface SensitivityCurve {
    // name: string;
    // [input_name: string]: Array<SensitivityCurvePoint>;
    name: string;
    label: string;
    type: "numerical" | "categorical";
    data: SensitivityCurvePred[];
}

export interface SensitivityCurvePred {
    prediction_name: string;
    curve: SensitivityCurvePoint[];
}

export interface SensitivityCurvePoint {
    feature_value: number;
    prediction: number;
}
