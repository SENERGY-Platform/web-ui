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

import {Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WidgetModel} from '../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {MatTable} from '@angular/material/table';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DataTableEditDialogComponent} from './dialog/data-table-edit-dialog.component';
import {
    QueriesRequestElementInfluxModel,
    QueriesRequestElementTimescaleModel,
    QueriesRequestFilterModel,
    TimeValuePairModel
} from '../shared/export-data.model';
import {DeviceStatusConfigConvertRuleModel} from '../device-status/shared/device-status-properties.model';
import {DBTypeEnum, ExportDataService} from '../shared/export-data.service';
import {DataTableOrderEnum, ExportValueTypes} from './shared/data-table.model';
import {DecimalPipe} from '@angular/common';
import {DashboardManipulationEnum} from '../../modules/dashboard/shared/dashboard-manipulation.enum';
import {Sort, SortDirection} from '@angular/material/sort';
import {map} from 'rxjs/internal/operators';

interface DataTableComponentItem {
    name: string;
    status: string | number | boolean | null;
    value: string | number | boolean | null;
    icon: string;
    color: string;
    class: string;
    time: string;
}

@Component({
    selector: 'senergy-data-table',
    templateUrl: './data-table.component.html',
    styleUrls: ['./data-table.component.css'],
})
export class DataTableComponent implements OnInit, OnDestroy {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild(MatTable, {static: false}) table!: MatTable<any>;
    destroy = new Subscription();
    configured = false;
    dataReady = false;
    items: DataTableComponentItem[] = [];
    matSortActive = '';
    matSortDirection: SortDirection = '';

    constructor(
        private dashboardService: DashboardService,
        private dialog: MatDialog,
        private exportDataService: ExportDataService,
        private decimalPipe: DecimalPipe,
    ) {
    }

    private static parseNumber(m: DataTableComponentItem, max: boolean): number {
        if (m.value == null) {
            if (max) {
                return Number.MAX_VALUE;
            }
            return Number.MIN_VALUE;
        }
        return Number(m.value);
    }

    ngOnInit() {
        switch (this.widget.properties.dataTable?.order) {
        case DataTableOrderEnum.AlphabeticallyAsc:
            this.matSortActive = 'name';
            this.matSortDirection = 'asc';
            break;
        case DataTableOrderEnum.AlphabeticallyDesc:
            this.matSortActive = 'name';
            this.matSortDirection = 'desc';
            break;
        case DataTableOrderEnum.ValueAsc:
            this.matSortActive = 'value';
            this.matSortDirection = 'asc';
            break;
        case DataTableOrderEnum.ValueDesc:
            this.matSortActive = 'value';
            this.matSortDirection = 'desc';
            break;
        case DataTableOrderEnum.TimeDesc:
            this.matSortActive = 'time';
            this.matSortDirection = 'desc';
            break;
        case DataTableOrderEnum.TimeAsc:
            this.matSortActive = 'time';
            this.matSortDirection = 'asc';
            break;
        }
        this.update();
        this.checkConfigured();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        const config: MatDialogConfig = {};
        config.data = {dashboardId: this.dashboardId, widgetId: this.widget.id};
        config.minWidth = '800px';
        this.dialog
            .open(DataTableEditDialogComponent, config)
            .afterClosed()
            .subscribe((widget: WidgetModel) => {
                if (widget !== undefined) {
                    this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
                }
            });
    }

    matSortChange(event: Sort) {
        if (this.widget.properties.dataTable === undefined) {
            return;
        }
        switch (event.active) {
        case 'value':
            if (event.direction === 'asc') {
                this.widget.properties.dataTable.order = DataTableOrderEnum.ValueAsc;
            } else {
                this.widget.properties.dataTable.order = DataTableOrderEnum.ValueDesc;
            }
            break;
        case 'name':
            if (event.direction === 'asc') {
                this.widget.properties.dataTable.order = DataTableOrderEnum.AlphabeticallyAsc;
            } else {
                this.widget.properties.dataTable.order = DataTableOrderEnum.AlphabeticallyDesc;
            }
            break;
        case 'time':
            if (event.direction === 'asc') {
                this.widget.properties.dataTable.order = DataTableOrderEnum.TimeAsc;
            } else {
                this.widget.properties.dataTable.order = DataTableOrderEnum.TimeDesc;
            }
            break;
        }
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe();
        this.orderItems();
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.dataReady = false;

                const elements = this.widget.properties.dataTable?.elements;
                if (elements) {
                    const influxRequestPayload: QueriesRequestElementInfluxModel[] = [];
                    const timescaleRequestPayload: QueriesRequestElementTimescaleModel[] = [];
                    const influxResultMapper: number[] = [];
                    const timescaleResultMapper: number[] = [];
                    elements.forEach((element, elementIndex) => {
                        const filters: QueriesRequestFilterModel[] = [];
                        element.exportTagSelection?.forEach((tagFilter) => {
                            filters.push({column: tagFilter.split('!')[0], type: '=', value: tagFilter.split('!')[1]});
                        });
                        const requestElement: QueriesRequestElementInfluxModel | QueriesRequestElementTimescaleModel = {
                            filters: filters.length > 0 ? filters : undefined,
                        } as QueriesRequestElementInfluxModel | QueriesRequestElementTimescaleModel;

                        if (
                            element.groupTime !== undefined &&
                            element.groupTime !== '' &&
                            element.groupTime !== null &&
                            element.groupType !== undefined &&
                            element.groupType !== '' &&
                            element.groupType !== null
                        ) {
                            // get digit part as number, multiply by valuesPerElement and append the unit
                            const digits = element.groupTime.match(/(\d+)/);
                            const unit = element.groupTime.match(/(\D+)/);
                            const last =
                                '' +
                                Number(digits !== null && digits.length > 0 ? digits[0] : 0) *
                                (this.widget.properties.dataTable?.valuesPerElement || 1) +
                                (unit !== null && unit.length > 0 ? unit[0] : '');

                            requestElement.time = {last};
                            requestElement.groupTime = element.groupTime;
                        } else {
                            requestElement.limit = this.widget.properties.dataTable?.valuesPerElement || 1;
                        }
                        // Check element data location
                        if (element.exportId !== null && element.exportId !== undefined && (element.exportDbId === undefined || element.exportDbId === DBTypeEnum.snrgyInflux)) {
                            (requestElement as QueriesRequestElementInfluxModel).measurement = element.exportId;
                            influxRequestPayload.push(requestElement as QueriesRequestElementInfluxModel);
                            influxResultMapper.push(elementIndex);
                            requestElement.columns = [{name: element.exportValueName, groupType: element.groupType || undefined}];
                        } else {
                            if (element.exportId === null || element.exportId === undefined) {
                                (requestElement as QueriesRequestElementTimescaleModel) .deviceId = element.elementDetails.device?.deviceId;
                                (requestElement as QueriesRequestElementTimescaleModel).serviceId = element.elementDetails.device?.serviceId;
                                (requestElement as QueriesRequestElementTimescaleModel).columns = [{name:  element.exportValuePath.replace(/^value\./, '')}];
                            } else {
                                (requestElement as QueriesRequestElementTimescaleModel).exportId = element.exportId;
                                requestElement.columns = [{name: element.exportValueName, groupType: element.groupType || undefined}];
                            }
                            timescaleRequestPayload.push(requestElement as QueriesRequestElementTimescaleModel);
                            timescaleResultMapper.push(elementIndex);
                        }
                    });
                    const obs: Observable<{ source: string; res: TimeValuePairModel[] }>[] = [];
                    if (influxRequestPayload.length > 0) {
                        obs.push(this.exportDataService
                            .queryInflux(influxRequestPayload)
                            .pipe(
                                map((values) => {
                                    const res: TimeValuePairModel[] = [];
                                    values.forEach((_, elementIndex) => {
                                        let dataRows = values[elementIndex];
                                        // sometimes an extra value if given by influx
                                        dataRows = dataRows.slice(0, this.widget.properties.dataTable?.valuesPerElement || 1);
                                        dataRows.forEach((dataRow) => {
                                            res.push({time: '' + dataRow[0], value: dataRow[1]});
                                        });
                                    });
                                    return {source: 'influx', res};
                                }),
                            ));
                    }
                    if (timescaleRequestPayload.length > 0) {
                        obs.push(this.exportDataService
                            .queryTimescale(timescaleRequestPayload)
                            .pipe(
                                map((values) => {
                                    const res: TimeValuePairModel[] = [];
                                    values.forEach((_, elementIndex) => {
                                        let dataRows = values[elementIndex];
                                        dataRows = dataRows.slice(0, this.widget.properties.dataTable?.valuesPerElement || 1);
                                        dataRows.forEach((dataRow) => {
                                            res.push({time: '' + dataRow[0], value: dataRow[1]});
                                        });
                                    });
                                    return {source: 'timescale', res};
                                }),
                            ));
                    }

                    forkJoin(obs).subscribe((results) => {
                        this.items = [];
                        results.forEach(result => {
                            result.res.forEach((pair: TimeValuePairModel, resultIndex: number) => {
                                let elementIndex = -1;
                                switch (result.source) {
                                case 'influx':
                                    elementIndex = influxResultMapper[resultIndex];
                                    break;
                                case 'timescale':
                                    elementIndex = timescaleResultMapper[resultIndex];
                                }
                                let v = pair.value;
                                if (v === true || v === false) {
                                    v = v as unknown as string;
                                }
                                const convert = this.convert(v, elements[elementIndex].valueType);
                                const item: DataTableComponentItem = {
                                    name: elements[elementIndex].name,
                                    status: v,
                                    value: v,
                                    icon: convert.icon,
                                    color: convert.color,
                                    class: '',
                                    time: '' + pair.time,
                                };
                                if (v !== null && item.icon === '') {
                                    if (
                                        (elements[elementIndex].valueType === ExportValueTypes.INTEGER ||
                                            elements[elementIndex].valueType === ExportValueTypes.FLOAT) &&
                                        elements[elementIndex].format !== undefined &&
                                        elements[elementIndex].format !== null &&
                                        elements[elementIndex].format !== ''
                                    ) {
                                        item.status = this.decimalPipe.transform(v, elements[elementIndex].format);
                                    }
                                    if (elements[elementIndex].unit) {
                                        item.status += ' ' + elements[elementIndex].unit;
                                    }
                                }

                                const warn = elements[elementIndex].warning;
                                if (warn !== undefined && warn.enabled) {
                                    if (
                                        (warn.upperBoundary !== undefined && v !== null && v > warn.upperBoundary) ||
                                        (warn.lowerBoundary !== undefined && v !== null && v < warn.lowerBoundary)
                                    ) {
                                        item.class = 'color-warn';
                                    }
                                }
                                this.items.push(item);
                            });
                        });
                        this.orderItems();
                        this.dataReady = true;
                    });
                } else {
                    this.dataReady = true;
                }
            }
        });
    }

    private orderItems() {
        if (this.widget.properties.dataTable?.order !== DataTableOrderEnum.Default) {
            this.items.sort((a, b) => {
                switch (this.widget.properties.dataTable?.order) {
                case DataTableOrderEnum.AlphabeticallyAsc:
                    return a.name.charCodeAt(0) - b.name.charCodeAt(0);
                case DataTableOrderEnum.AlphabeticallyDesc:
                    return b.name.charCodeAt(0) - a.name.charCodeAt(0);
                case DataTableOrderEnum.ValueAsc:
                    if (typeof a.value === 'string' || typeof b.value === 'string') {
                        return ('' + a.value).localeCompare('' + b.value);
                    }
                    return DataTableComponent.parseNumber(a, true) - DataTableComponent.parseNumber(b, true);
                case DataTableOrderEnum.ValueDesc:
                    if (typeof a.value === 'string' || typeof b.value === 'string') {
                        return ('' + b.value).localeCompare('' + a.value);
                    }
                    return DataTableComponent.parseNumber(b, false) - DataTableComponent.parseNumber(a, false);
                case DataTableOrderEnum.TimeDesc:
                    return new Date(b.time || '').valueOf() - new Date(a.time || '').valueOf();
                case DataTableOrderEnum.TimeAsc:
                    return new Date(a.time || '').valueOf() - new Date(b.time || '').valueOf();
                default:
                    console.error('DataTableComponent:orderItems: unknown order type');
                    return 0;
                }
            });
        }
        if (this.table) {
            this.table.renderRows();
        }
    }

    private convert(status: string | number | boolean | null, type: ExportValueTypes): { icon: string; color: string } {
        const convertRules: DeviceStatusConfigConvertRuleModel[] | undefined = this.widget.properties.dataTable?.convertRules;
        if (convertRules) {
            for (let i = 0; i < convertRules.length; i++) {
                switch (type) {
                case ExportValueTypes.STRING: {
                    if (status === convertRules[i].status) {
                        return {icon: convertRules[i].icon, color: convertRules[i].color};
                    }
                    break;
                }
                case ExportValueTypes.BOOLEAN: {
                    try {
                        if (status === JSON.parse(convertRules[i].status)) {
                            return {icon: convertRules[i].icon, color: convertRules[i].color};
                        }
                    } catch (_) {
                    } // happens when rule is not parsable, no problem
                    break;
                }
                case ExportValueTypes.FLOAT:
                case ExportValueTypes.INTEGER: {
                    if (status === parseInt(convertRules[i].status, 10)) {
                        return {icon: convertRules[i].icon, color: convertRules[i].color};
                    }
                    break;
                }
                }
            }
        }
        return {icon: '', color: ''};
    }

    private checkConfigured() {
        this.configured = this.widget.properties.dataTable !== undefined && this.widget.properties.dataTable.elements.length > 0;
    }
}
