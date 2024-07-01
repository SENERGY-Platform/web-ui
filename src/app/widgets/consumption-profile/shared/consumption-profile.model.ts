export interface ConsumptionProfileResponse {
    message: string;
    value: number;
    last_consumptions: any[][];
    time_window: any;
    timestamp: Date;
}

export interface ConsumptionProfileProperties {
    exportID: string;
}

export interface ConsumptionProfilePropertiesModel {
    consumptionProfile?: ConsumptionProfileProperties;
}