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

import { isAxisGroupInterval } from '../../shared/data-source-selector/group-options';
import { ChartsExportVAxesModel } from './charts-export-properties.model';

/** Only line charts take a grouping per axis; a stored one is kept but ignored for every other type. */
export function supportsAxisGroup(chartType: string | undefined): boolean {
    return chartType === undefined || chartType === '' || chartType === 'LineChart';
}

/**
 * The axis' own grouping, or undefined when it follows the widget: no group set, another chart type, or a type
 * without a valid time (the backend rejects the whole request for that). type '' is the raw series.
 */
export function ownAxisGroup(axis: ChartsExportVAxesModel, chartType: string | undefined): { type: string; time: string } | undefined {
    const group = axis.ownGroup;
    if (group === undefined || group === null || !supportsAxisGroup(chartType)) {
        return undefined;
    }
    if (group.type === '') {
        return { type: '', time: '' };
    }
    return group.type && isAxisGroupInterval(group.time) ? { type: group.type, time: group.time } : undefined;
}

/** The group type an axis is read with: its own on a line chart, else the widget's. */
export function effectiveGroupType(axis: ChartsExportVAxesModel, chartType: string | undefined, widgetGroupType: string | null | undefined): string | null | undefined {
    return axis.ownGroup !== undefined && axis.ownGroup !== null && supportsAxisGroup(chartType) ? axis.ownGroup.type : widgetGroupType;
}

/** The axis' label in legend and tooltip: the alias wins, otherwise the value name with its own grouping appended. A drilled series without a name has no suffix. */
export function axisLabel(axis: ChartsExportVAxesModel, chartType: string | undefined): string {
    if (axis.valueAlias) {
        return axis.valueAlias;
    }
    const own = ownAxisGroup(axis, chartType);
    if (own === undefined || axis.valueName === '') {
        return axis.valueName;
    }
    return axis.valueName + (own.type === '' ? ' (raw)' : ' (' + own.type + ' ' + own.time + ')');
}
