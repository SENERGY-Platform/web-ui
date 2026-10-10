/*
 * Copyright 2020 InfAI (CC SES)
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

import { Injectable } from '@angular/core';
import { GoogleChartComponent } from 'ng2-google-charts';
import {WidgetModel, WidgetPropertiesModels} from '../../../modules/dashboard/shared/dashboard-widget.model';

@Injectable({
    providedIn: 'root',
})
export class ChartsService {
    constructor() {}

    // Workaround to prevent Google Charts Library from causing memory leaks
    releaseResources(chartComponent: GoogleChartComponent) {
        if (chartComponent && chartComponent.wrapper) {
            const chart = chartComponent.wrapper.getChart();

            if (chart) {
                try {
                    chart.clearChart();

                    chart.hv = {};
                    chart.iv = {};
                    chart.jv = {};

                    Object.keys(chart).forEach(function(key) {
                        delete chart[key];
                    });
                } catch (e) {
                    console.log('Error releasing resources: ' + e);
                }

                try {
                    delete chartComponent.data.component;
                } catch (e) {
                    console.log('Error releasing resources: ' + e);
                }

                try {
                    Object.keys(chartComponent.wrapper).forEach(function(key) {
                        delete chartComponent.wrapper[key];
                    });

                    delete chartComponent.wrapper;
                } catch (e) {
                    console.log('Error releasing resources: ' + e);
                }
            }
        }
    }

    cleanup(widget: WidgetModel) {
        for (let i = localStorage.length; i >= 0; i--) { // reverse order, since deleting messes with index
            const key = localStorage.key(i);
            if (key?.startsWith(widget.id)) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Drops the drill and zoom state an export chart keeps in localStorage when an edit changed the properties it overrides.
     * A refresh sends the widget unchanged, so the state survives it.
     */
    cleanupStaleViewState(widgetId: string, before: WidgetPropertiesModels | undefined, after: WidgetPropertiesModels | undefined) {
        const changed = (...keys: (keyof WidgetPropertiesModels)[]) => keys.some(k => JSON.stringify(settingValue(before?.[k])) !== JSON.stringify(settingValue(after?.[k])));
        const remove = (...keys: string[]) => keys.forEach(k => localStorage.removeItem(widgetId + k));
        if (changed('vAxes', 'stacked')) {
            remove('_modifiedvAxes', '_drillStack', '_chooseColors', '_stacked');
        }
        if (changed('group', 'time', 'timeRangeType', 'hAxisFormat', 'chartType')) {
            remove('_groupTime', '_hAxisFormat', '_from', '_to');
        }
    }
}

/**
 * A property value in a canonical form: sorted keys, and null, undefined and '' dropped as unset. The edit dialog turns
 * missing values into null (or '' for a missing time range) and orders keys differently than the server.
 */
function settingValue(value: any): any {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(settingValue);
    }
    if (typeof value === 'object') {
        const res: { [key: string]: any } = {};
        Object.keys(value).sort().forEach(key => {
            const v = settingValue(value[key]);
            if (v !== undefined) {
                res[key] = v;
            }
        });
        return Object.keys(res).length === 0 ? undefined : res;
    }
    return value;
}
