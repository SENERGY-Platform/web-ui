export interface ConsumptionProfileResponse {
    type: string;
    value: boolean;
    last_consumptions: any[][];
    time_window: any;
    timestamp: Date;
    initial_phase: string;
}

export interface ConsumptionProfileProperties {
    exportID: string;
}

export interface ConsumptionProfilePropertiesModel {
    consumptionProfile?: ConsumptionProfileProperties;
}