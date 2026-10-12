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

import { AirQualityExternalProvider, MeasurementModel, SensorDataModel } from './air-quality.model';

function emptyData(): SensorDataModel {
    return { column: { InstanceID: '', Name: '', Path: '', Type: '' }, value: NaN };
}

/** A fresh list per call: the dialog edits the entries in place (ngModel). */
export function createMeasurementCatalogue(): MeasurementModel[] {
    return [
        {
            name_html: 'PM10',
            short_name: 'PM10',
            description_html: 'Particulate matter up to 10μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 40 }, critical: { lower: 0, upper: 50 } },
        },
        {
            name_html: 'PM2.5',
            short_name: 'PM2.5',
            description_html: 'Particulate matter up to 2.5μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 25 }, critical: { lower: 0, upper: 30 } },
        },
        {
            name_html: 'PM1',
            short_name: 'PM1',
            description_html: 'Particulate matter up to 1μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 0, upper: 0 } },
        },
        {
            name_html: 'CO<sub>2</sub>',
            short_name: 'CO2',
            description_html: 'Carbon Dioxide',
            unit_html: 'ppm',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 1000 }, critical: { lower: 0, upper: 5000 } },
        },
        {
            name_html: 'O<sub>2</sub>',
            short_name: 'O2',
            description_html: 'Oxygen',
            unit_html: '%',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 19, upper: 21 }, critical: { lower: 18, upper: 25 } },
        },
        {
            name_html: 'SO<sub>2</sub>',
            short_name: 'SO2',
            description_html: 'Sulfur Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 1, upper: 0 } },
        },
        {
            name_html: 'CH<sub>4</sub>',
            short_name: 'CH4',
            description_html: 'Methane',
            unit_html: '%',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 1, upper: 0 } },
        },
        {
            name_html: 'NO<sub>2</sub>',
            short_name: 'NO2',
            description_html: 'Nitrogen Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 40 }, critical: { lower: 0, upper: 200 } },
        },
        {
            name_html: 'CO',
            short_name: 'CO',
            description_html: 'Carbon Monoxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 8 }, critical: { lower: 0, upper: 35 } },
        },
        {
            name_html: 'O<sub>3</sub>',
            short_name: 'O3',
            description_html: 'Ozone',
            unit_html: 'μg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 0, upper: 180 } },
        },
        {
            name_html: 'Rn',
            short_name: 'Rn',
            description_html: 'Radon',
            unit_html: 'Bq/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 250 }, critical: { lower: 0, upper: 1000 } },
        },
        {
            name_html: 'Hum.',
            short_name: 'Hum.',
            description_html: 'relative Humidity',
            unit_html: '%',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 40, upper: 50 }, critical: { lower: 30, upper: 70 } },
        },
        {
            name_html: 'Temp.',
            short_name: 'Temp.',
            description_html: 'Temperature',
            unit_html: '°C',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 20, upper: 22 }, critical: { lower: 18, upper: 26 } },
        },
        {
            name_html: 'Noise',
            short_name: 'Noise',
            unit_html: 'dB',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 40 }, critical: { lower: 0, upper: 65 } },
        },
        {
            name_html: 'VOC',
            short_name: 'VOC',
            description_html: 'Volatile Organic Compounds',
            unit_html: 'mg/m<sup>3</sup>',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 10 } },
        },
        {
            name_html: 'Pressure',
            short_name: 'Pressure',
            description_html: 'Barometric Air Pressure',
            unit_html: 'hPa',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 0, upper: 1100 }, critical: { lower: 0, upper: 1100 } },
        },
        {
            name_html: 'Precipitation (1 h)',
            short_name: 'Precipitation',
            description_html: 'Precipitation within the next hour',
            unit_html: 'mm',
            data: emptyData(),
            outsideData: emptyData(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 0, upper: 1 } },
        },
    ];
}

/** A fresh list per call: the dialog edits the entries in place (ngModel). */
export function createPollenCatalogue(): MeasurementModel[] {
    return [
        {
            name_html: 'Ambrosia',
            short_name: 'Ambrosia',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Birke',
            short_name: 'Birke',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Erle',
            short_name: 'Erle',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Hasel',
            short_name: 'Hasel',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Beifuss',
            short_name: 'Beifuss',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Esche',
            short_name: 'Esche',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Roggen',
            short_name: 'Roggen',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
        {
            name_html: 'Graeser',
            short_name: 'Graeser',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: emptyData(),
            outsideData: emptyData(),
        },
    ];
}
