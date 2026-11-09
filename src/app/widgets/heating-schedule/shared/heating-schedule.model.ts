/*
 * Copyright 2026 InfAI (CC SES)
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

/** Name of the release whose instances the widget can show. */
export const HEATING_RELEASE_NAME = 'Heizungssteuerung';

/** Ids of the release parameters the widget reads and writes. */
export const HEATING_SCHEDULE_PARAMETER = 'schedule';
export const HEATING_SETBACK_PARAMETER = 'setback';
export const HEATING_THERMOSTATS_PARAMETER = 'thermostats';

export interface HeatingScheduleConfig {
    instanceId: string;
}

export interface HeatingSchedulePropertiesModel {
    heatingSchedule?: HeatingScheduleConfig;
}

export function heatingInstanceId(properties: object): string | undefined {
    return (properties as HeatingSchedulePropertiesModel).heatingSchedule?.instanceId;
}

export function setHeatingInstanceId(properties: object, instanceId: string): void {
    (properties as HeatingSchedulePropertiesModel).heatingSchedule = { instanceId };
}
