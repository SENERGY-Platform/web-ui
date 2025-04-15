import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../../charts/export/shared/charts-export-properties.model';

export interface DeviceValue {
    timestamp: string;
    value: number;
}

export interface VentilationResult {
    humidity_too_fast_too_high: string;
    window_open: boolean;
    timestamp: string;
}

export interface VentilationWidgetProperties {
    deviceConfig: {
        exports: DeviceInstanceModel[];
        fields: ChartsExportVAxesModel[];
    };
    exportConfig: {
        exports: ChartsExportMeasurementModel[];
    };
    timeRangeConfig: {
        timeRange: { // This extra key is needed, so that it can be passed directly in the data source selector component which expects this key for time range configs
            time?: number;
            start?: string;
            end?: string;
            level?: string;
            type?: string;
        };
    };
}

export interface VentilationWidgetPropertiesModel {
    badVentilation?: VentilationWidgetProperties;
}
