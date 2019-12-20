/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {GoogleChartComponent} from 'ng2-google-charts';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ElementSizeService} from '../../../core/services/element-size.service';
import {ChartsModel} from '../shared/charts.model';
import {ChartsExportService} from './shared/charts-export.service';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {ErrorModel} from '../../../core/model/error.model';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';

@Component({
    selector: 'senergy-charts-export',
    templateUrl: './charts-export.component.html',
    styleUrls: ['./charts-export.component.css'],
})
export class ChartsExportComponent implements OnInit, OnDestroy {

    chartExportData = {} as ChartsModel;
    ready = false;
    destroy = new Subscription();
    configureWidget = false;
    error = false;
    errorMessage = {} as ErrorModel;

    private resizeTimeout = 0;
    private measurementId = '';
    private interval = 0;

    @ViewChild('chartExport') chartExport!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = window.setTimeout(() => {
                this.resizeProcessInstancesStatusChart();
                this.resizeTimeout = 0;
            }, 500);
        }
    }

    constructor(private chartsExportService: ChartsExportService,
                private elementSizeService: ElementSizeService,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService) {
    }

    ngOnInit() {
        this.getData();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.chartsExportService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getData() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.checkConfiguration();
                if (this.configureWidget === false) {
                    this.chartsExportService.getChartData(this.widget).subscribe((resp: (ChartsModel | ErrorModel)) => {
                        if (this.errorHandlerService.checkIfErrorExists(resp)) {
                            this.error = true;
                            this.errorMessage = resp;
                            this.ready = true;
                        } else {
                            this.error = false;
                            this.chartExportData = resp;
                            this.ready = true;
                        }
                    });
                } else {
                    this.ready = true;
                }
            }
        });
    }

    private checkConfiguration() {
        if (this.widget.properties.measurement === undefined) {
            this.configureWidget = true;
        } else {
            this.measurementId = this.widget.properties.measurement.id;
        }

        if (this.widget.properties.interval === undefined || this.widget.properties.interval === null) {
            this.configureWidget = true;
        } else {
            this.interval = this.widget.properties.interval;
        }
    }

    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5);
        if (this.chartExportData.options !== undefined) {
            this.chartExportData.options.height = element.height;
            this.chartExportData.options.width = element.width;
            if (this.chartExportData.options.chartArea) {
                this.chartExportData.options.chartArea.height = element.heightPercentage;
                this.chartExportData.options.chartArea.width = element.widthPercentage;
            }
            if (this.chartExportData.dataTable[0].length > 0 ) {
                this.chartExport.redraw();
            }
        }
    }
}
