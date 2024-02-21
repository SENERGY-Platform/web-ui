import { DeviceGroupsPermSearchModel } from "src/app/modules/devices/device-groups/shared/device-groups-perm-search.model";
import { DeviceInstancesModel } from "src/app/modules/devices/device-instances/shared/device-instances.model";
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from "../../export/shared/charts-export-properties.model";

export interface OpenWindowPropertiesModel {
    windowExports?: ChartsExportMeasurementModel[] | DeviceInstancesModel[] | DeviceGroupsPermSearchModel[];
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