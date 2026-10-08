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

import { Component, Input, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MultiValueService } from './shared/multi-value.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { MultiValueMeasurement, MultiValueOrderEnum } from './shared/multi-value.model';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { NgClass, DecimalPipe, PercentPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-multi-value',
    templateUrl: './multi-value.component.html',
    styleUrls: ['./multi-value.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, NgClass, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, WidgetFooterComponent, DecimalPipe, PercentPipe, CurrencyPipe, DatePipe]
})
export class MultiValueComponent implements OnInit {
    private iconRegistry = inject(MatIconRegistry);
    private sanitizer = inject(DomSanitizer);
    private multiValueService = inject(MultiValueService);
    private dashboardService = inject(DashboardService);
    private destroyRef = inject(DestroyRef);

    configured = false;
    dataReady = false;
    orderedValues: MultiValueMeasurement[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    @ViewChild(MatTable, { static: false }) table!: MatTable<any>;

    ngOnInit() {
        this.update();
        this.registerIcons();
        this.setConfigured();
    }

    registerIcons() {
        // this.iconRegistry.addSvgIcon('online', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/connect_white.svg'));
    }

    edit() {
        this.multiValueService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    checkWarning(m: MultiValueMeasurement): boolean {
        if (m.warning_enabled && m.data && m.lowerBoundary && (m.data as number) < m.lowerBoundary) {
            return true;
        }
        if (m.warning_enabled && m.data && m.upperBoundary && (m.data as number) > m.upperBoundary) {
            return true;
        }
        return false;
    }

    private update() {
        this.setConfigured();
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.dataReady = false;
                this.multiValueService.getValues(this.widget).subscribe((result) => {
                    this.widget = result;
                    this.dataReady = true;
                    this.orderValues(this.widget.properties.order || 0);
                });
            }
        });
    }

    /**
     * Checks if the widget is configured. The widget is considered configured if all exports and columns are set
     */
    private setConfigured() {
        this.configured = true;
        if (this.widget.properties.multivaluemeasurements) {
            for (const measurement of this.widget.properties.multivaluemeasurements) {
                if (measurement.export.id === '' || measurement.column.Name === '' || measurement.type === '') {
                    this.configured = false;
                    return;
                }
            }
        } else {
            this.configured = false;
        }
    }

    private orderValues(sortId: number) {
        const m = this.widget.properties.multivaluemeasurements || [];
        switch (sortId) {
        case MultiValueOrderEnum.AlphabeticallyAsc:
            m.sort((a, b) => a.name.charCodeAt(0) - b.name.charCodeAt(0));
            break;
        case MultiValueOrderEnum.AlphabeticallyDesc:
            m.sort((a, b) => b.name.charCodeAt(0) - a.name.charCodeAt(0));
            break;
        case MultiValueOrderEnum.ValueAsc:
            m.sort((a, b) => this.parseNumber(a, true) - this.parseNumber(b, true));
            break;
        case MultiValueOrderEnum.ValueDesc:
            m.sort((a, b) => this.parseNumber(b, false) - this.parseNumber(a, false));
            break;
        case MultiValueOrderEnum.TimeDesc:
            m.sort((a, b) => new Date(b.time || '').valueOf() - new Date(a.time || '').valueOf());
            break;
        case MultiValueOrderEnum.TimeAsc:
            m.sort((a, b) => new Date(a.time || '').valueOf() - new Date(b.time || '').valueOf());
            break;
        }
        this.orderedValues = m;
        if (this.table) {
            this.table.renderRows();
        }
    }

    private parseNumber(m: MultiValueMeasurement, max: boolean): number {
        if (m.data == null || m.type === 'String') {
            if (max) {
                return Number.MAX_VALUE;
            }
            return Number.MIN_VALUE;
        }
        return Number(m.data);
    }

    matSortChange(event: Sort) {
        switch (event.active) {
        case 'value':
            if (event.direction === 'asc') {
                this.orderValues(MultiValueOrderEnum.ValueAsc);
            } else {
                this.orderValues(MultiValueOrderEnum.ValueDesc);
            }
            break;
        case 'name':
            if (event.direction === 'asc') {
                this.orderValues(MultiValueOrderEnum.AlphabeticallyAsc);
            } else {
                this.orderValues(MultiValueOrderEnum.AlphabeticallyDesc);
            }
            break;
        }
    }
}
