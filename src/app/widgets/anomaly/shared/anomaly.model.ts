export interface AnomalyResultModel {
    value: string;
    type: string;
    subType: string;
    timestamp: string;
    threshold: number;
    mean: number;
    initial_phase: string;
    device_id: string;
}

export interface AnomalyWidgetProperties {
    showForAllDevices: boolean;
    showDebug: boolean;
    export: string;
    onlyDataWindows: boolean;
    filterDeviceIds: string[];
}

export interface AnomalyWidgetPropertiesModel {
    anomalyDetection?: AnomalyWidgetProperties;
}