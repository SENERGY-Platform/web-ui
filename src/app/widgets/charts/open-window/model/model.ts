import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ChartsExportMeasurementModel } from '../../export/shared/charts-export-properties.model';
import { DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';

export interface OpenWindowPropertiesModel {
    windowExports?: ChartsExportMeasurementModel[] | DeviceInstanceModel[] | DeviceGroupModel[];
    windowTimeRange?: {
        time?: number;
        start?: string;
        end?: string;
        level?: string;
        type?: string;
    };
    hAxisLabel?: string;
    vAxisLabel?: string;
};