export interface PVPrediction {
    timestamp: string;
    value: number;
}

export interface PVPredictionResult {
    predictions: PVPrediction[];
}

export interface PVPredictionNextValue {
    time: number;
    level: string;
}

export interface PVPredictionProperties {
    exportID: string;
    displayTimeline: boolean;
    displayNextValue: boolean;
    nextValueConfig: PVPredictionNextValue;
}

export interface PVPredictionWidgetPropertiesModel {
    pvPrediction?: PVPredictionProperties;
}
