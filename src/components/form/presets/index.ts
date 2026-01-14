import React from "react";
import { BasePresetProps } from "./types";
import { SelectPreset } from "./SelectPreset";

export type PresetComponent = React.FC<BasePresetProps>;

// Currently we only have one type of preset, but structure allows for expansion
export const presetRegistry: Record<string, PresetComponent> = {
    default: SelectPreset,
    select: SelectPreset,
};

export const getPresetComponent = (type: string = "default"): PresetComponent => {
    return presetRegistry[type] || SelectPreset;
};
