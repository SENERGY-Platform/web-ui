/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface AcControlPropertiesModel {
    acControl?: {
        deviceId?: string;
        deviceGroupId?: string;
        minTarget: number;
        maxTarget: number;
        tempStep: number;
        getCleaningRequired?: AcControlElementModel;
        getOnOff?: AcControlElementModel;
        setOn?: AcControlElementModel;
        setOff?: AcControlElementModel;
        getMode?: AcControlElementModel;
        setModeAuto?: AcControlElementModel;
        setModeCool?: AcControlElementModel;
        setModeHeat?: AcControlElementModel;
        setModeVent?: AcControlElementModel;
        setModeDry?: AcControlElementModel;
        getLocked?: AcControlElementModel;
        setUnlocked?: AcControlElementModel;
        setLocked?: AcControlElementModel;
        getTargetTemperature?: AcControlElementModel[];
        setTargetTemperature?: AcControlElementModel[];
        getTemperatureMeasurements?: AcControlElementModel[];
        getFanSpeedLevel?: AcControlElementModel;
        setFanSpeedLevel?: AcControlElementModel;
        getFanSpeedLevelAutomatic?: AcControlElementModel;
        setFanSpeedLevelAutomatic?: AcControlElementModel;
        getBatteryLevel?: AcControlElementModel;
    };
}

export interface AcControlElementModel {
    aspectId: string;
    serviceId?: string;
    functionId: string;
    value?: any;
}
