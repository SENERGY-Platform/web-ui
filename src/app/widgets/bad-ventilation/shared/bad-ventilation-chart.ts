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

import { DeviceValue, VentilationResult } from './model';

export const highHumidityColor = '#EE4B2B';
export const openWindowColor = '#097969';

export interface VentilationRange {
    from: number;
    to: number;
    color: string;
    label: string;
}

export function humidityPoints(data: DeviceValue[]): { x: number; y: number }[] {
    return data.map((row) => ({ x: new Date(row.timestamp).getTime(), y: row.value }));
}

/**
 * Walks the results newest first: a high humidity increase is marked from the closed window before it,
 * an open window from its opening to its closing.
 */
export function ventilationRanges(results: VentilationResult[]): VentilationRange[] {
    const ranges: VentilationRange[] = [];
    for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const nextResult = results[index + 1];
        if (nextResult == null) {
            break;
        }

        const dateStrOfHighHumidty = result.humidity_too_fast_too_high;
        if (dateStrOfHighHumidty !== '') {
            if (nextResult.window_open === true) {
                // if next result was a open window, we skip as high humidity can only be detected after an closed window
                continue;
            }
            ranges.push({
                from: new Date(nextResult.timestamp).getTime(),
                to: new Date(dateStrOfHighHumidty).getTime(),
                color: highHumidityColor,
                label: 'High Humidity Increase',
            });
            continue;
        }

        if (result.window_open === false) {
            if (nextResult.window_open === false) {
                // if next result was a closed window, we skip as closed windows can only be detected after an opened window
                continue;
            }
            ranges.push({
                from: new Date(nextResult.timestamp).getTime(),
                to: new Date(result.timestamp).getTime(),
                color: openWindowColor,
                label: 'Open Window',
            });
        }
    }
    return ranges;
}

/** Apex x axis annotation: the range filled and labelled in its colour, white text. */
export function apexRangeAnnotation(range: VentilationRange) {
    return {
        x: range.from,
        x2: range.to,
        fillColor: range.color,
        label: {
            text: range.label,
            borderColor: range.color,
            style: {
                background: range.color,
                color: '#fff'
            }
        }
    };
}
