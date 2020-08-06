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

import {Injectable} from "@angular/core";
import {GoogleChartComponent} from "ng2-google-charts";

@Injectable({
    providedIn: 'root'
})
export class ChartsService {

    constructor() {
    }

    // Workaround to prevent Google Charts Library from causing memory leaks
    releaseResources(chartComponent: GoogleChartComponent) {
        if (chartComponent) {
            let chart = chartComponent.wrapper.getChart();

            try {
                chart.clearChart();

                chart.hv = {};
                chart.iv = {};
                chart.jv = {};

                Object.keys(chart).forEach(function (key) {
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
                Object.keys(chartComponent.wrapper).forEach(function (key) {
                    delete chartComponent.wrapper[key];
                });

                delete chartComponent.wrapper;
            } catch (e) {
                console.log('Error releasing resources: ' + e);
            }
        }
    }
}