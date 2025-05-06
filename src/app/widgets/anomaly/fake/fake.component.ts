/*
 * Copyright 2025 InfAI (CC SES)
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

import { AfterViewChecked, Component, HostListener, Input } from '@angular/core';
import { concatMap, of, throwError } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportService } from '../../charts/export/shared/charts-export.service';

@Component({
    selector: 'fake-senergy-anomaly-detection',
    templateUrl: './fake.component.html',
    styleUrls: ['./fake.component.css']
})
export class FakeAnomalyComponent implements AfterViewChecked {
    type = 'curve_anomaly'; // time, schema, curve_anomaly
    style = '';

    timestamp = new Date();
    fromTimestamp? = '';
    toTimestamp? = '';
    value = '';
    errorMessage = '';
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    timelineChartData: any = [];
    chartDataReady = false;
    timelineWidth = 500;
    timelineHeight = 400;

    initialized = false;

    properties = {
        exports: [{
            id: '1ad3994f-c03f-4c7d-9b9c-eec1595fd7f9',
            name: 'value',
            values: [],
            exportDatabaseId: 'urn:infai:ses:export-db:ac535dbb-4600-4b84-8660-2f40de034644'
        }, {
            id: 'f53512e9-8427-4d27-a55b-799c4ad418d8',
            name: 'value',
            values: [],
            exportDatabaseId: 'urn:infai:ses:export-db:ac535dbb-4600-4b84-8660-2f40de034644'
        }],
        group: {
            time: '5m',
            type: 'mean'
        },
        time: {
            last: '1d',
            ahead: undefined,
            start: undefined,
            end: undefined
        },
        timeRangeType: 'relative',
        vAxes: [{
            instanceId: '1ad3994f-c03f-4c7d-9b9c-eec1595fd7f9',
            exportName: '',
            color: '',
            math: '',
            valueName: 'value',
            valueType: '',
            conversions: [{
                from: '1',
                to: '1',
                color: '#AA4A44',
                alias: 'auffällig'
            }, {
                from: '0',
                to: '0',
                color: '#50C878',
                alias: 'normal'
            }],
            valueAlias: 'Temperatur'
        }, {
            instanceId: 'f53512e9-8427-4d27-a55b-799c4ad418d8',
            exportName: '',
            color: '',
            math: '',
            valueName: 'value',
            valueType: '',
            conversions: [{
                from: '1',
                to: '1',
                color: '#AA4A44',
                alias: 'auffällig'
            }, {
                from: '0',
                to: '0',
                color: '#50C878',
                alias: 'normal'
            }],
            valueAlias: 'Druck'
        }]
    };

    @HostListener('window:resize')
    onResize() {
        this.resize();
    }

    constructor(
        private chartsExportService: ChartsExportService,
        private errorHandlerService: ErrorHandlerService,
        private elementSizeService: ElementSizeService
    ) {}

    ngAfterViewChecked(): void {
        if(!this.initialized) {
            // this.lastAnomaly();
            this.loadTimelineData(this.properties).subscribe({
                next: (chartData) => {
                    this.timelineChartData = chartData;
                    this.resize();
                    this.chartDataReady = true;
                    this.style = 'timeline';
                },
                error: (_) => {
                    this.errorMessage = 'Error';
                }
            });
            this.initialized = true;
        }

    }

    lastAnomaly() {
        this.fromTimestamp = undefined;
        this.toTimestamp = undefined;

        this.chartsExportService.getData(this.properties).subscribe({
            next: (r) => {
                const resp = r.data;
                const threshold = 100;
                if (resp != null && this.errorHandlerService.checkIfErrorExists(resp)) {
                    this.errorMessage = 'No data';
                } else if (resp != null) {
                    const data = resp[0][0];
                    data.sort((a,b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

                    let intervalFound = true;
                    for (let index = 0; index < data.length; index++) {
                        const row = data[index];
                        const currentValue = row[1];
                        const ts = row[0];
                        let prevTs = new Date().toDateString();
                        if(index > 0) {
                            const prevRow = data[index-1];
                            prevTs = prevRow[0];
                        }

                        if(currentValue > threshold && intervalFound) {
                            this.toTimestamp = ts;
                            intervalFound = false;
                        }
                        if(currentValue < threshold && !intervalFound) {
                            this.fromTimestamp = prevTs;
                            intervalFound = true;
                        }
                    }
                    this.style = 'single';
                }
            },
            error: (_) => {
                this.errorMessage = 'Error';
            }
        });
    }

    resize() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5, 10);
        this.timelineWidth = element.width;
        this.timelineHeight = element.height;
    }

    parseSingleExportData(data: any, threshold: any) {
        const chartData: any[] = [];

        data.sort((a: any,b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

        let intervalFound = true;
        for (let index = 0; index < data.length; index++) {
            const row = data[index];
            const currentValue = row[1];
            const ts = row[0];
            let prevTs = new Date().toDateString();
            if(index > 0) {
                const prevRow = data[index-1];
                prevTs = prevRow[0];
            }

            if(currentValue > threshold && intervalFound) {
                chartData.push([ts, 1]);
                intervalFound = false;
            } else if(currentValue < threshold && !intervalFound) {
                chartData.push([prevTs, 1]);
                intervalFound = true;
            } else if (intervalFound) {
                chartData.push([ts, 0]);
            } else if(!intervalFound && index === data.length -1) {
                // anomaly at the beggining of the data history
                chartData.push([ts, 1]);
            }
        }

        return chartData;
    }

    loadTimelineData(properties: any) {
        const timelineChartData: any = [];
        return this.chartsExportService.getData(properties).pipe(
            concatMap((r) => {
                const resp = r.data;
                if (resp != null && this.errorHandlerService.checkIfErrorExists(resp)) {
                    return throwError(() => new Error('No data'));
                } else if (resp != null) {
                    const tempData = resp[0][0];
                    timelineChartData.push([this.parseSingleExportData(tempData, 100)]);

                    const gasData = resp[0][1];
                    timelineChartData.push([this.parseSingleExportData(gasData, 3)]);

                    return of(timelineChartData);
                }
                return of();
            })
        );
    }

}
