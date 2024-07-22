export interface LeakageDetectionResponse {
    message: string;
    value: number;
    last_consumptions: any[][];
    time_window: any;
    timestamp: Date;
    initial_phase: string;
}

export interface LeackageDetectionProperties {
    exportID: string;
}

export interface LeakageDetectionWidgetPropertiesModel {
    leakageDetection?: LeackageDetectionProperties;
}