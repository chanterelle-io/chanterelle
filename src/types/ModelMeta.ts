// Model Input Constraint
export interface ModelInputConstraint {
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{
        value: string;
        label?: string;
        description?: string;
    }> | string[];
    regex?: string;
    // For textarea
    rows?: number;
    placeholder?: string;
    // For file input
    extensions?: string[];
    multiple?: boolean;
}

// Model Input Dependency Mapping
export interface ModelInputDependencyMapping {
    [parentValue: string]: {
        constraints?: ModelInputConstraint;
    };
}

// Model Input
export interface ModelInput {
    name: string;
    label: string;
    type: 'float' | 'int' | 'string' | 'category' | 'boolean' | 'textarea' | 'file';
    unit?: string;
    required?: boolean;
    description?: string;
    default?: any;
    constraints?: ModelInputConstraint;
    depends_on?: {
        input_name: string;
        mapping: ModelInputDependencyMapping;
    };
}

// Model Input Preset
export interface ModelInputPreset {
    input_preset: string;
    label: string;
    description: string;
    affects: string[];
    presets: Array<{
        name: string;
        values: {
            [inputName: string]: any;
        };
    }>;
    depends_on?: {
        field: string;
        mapping: ModelInputDependencyMapping;
    };
}

// Model Input Grouping
export interface ModelInputGrouping {
    grouping: string;
    description: string;
    inputs: string[];
}

// Model Output
export interface ModelOutput {
    name: string;
    label: string;
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

// Python Environment Configuration
export interface PythonEnvironment {
    type: 'system' | 'venv' | 'conda' | 'virtualenv';
    path?: string;  // Used for venv and virtualenv
    name?: string;  // Used for conda
}

// Model Meta
export interface ModelMeta {
    model_id: string;
    model_name: string;
    model_version: string;
    description_short?: string;
    description: string;
    links?: Array<{
        name: string;
        url?: string;
        file_name?: string;
    }>;
    tags?: {
        [tag_name: string]: string;
    };
    inputs: ModelInput[];
    input_presets?: ModelInputPreset[];
    input_groupings?: ModelInputGrouping[];
    outputs: ModelOutput[];
    signed_url_base?: string;
    signed_url_params?: string;
    python_environment?: PythonEnvironment;
}

export interface ModelMetaShort {
    project_name: string;
    model_id: string;
    model_name: string;
    description: string;
    description_short?: string;
    tags?: {
        [tag_name: string]: string;
    };
}
