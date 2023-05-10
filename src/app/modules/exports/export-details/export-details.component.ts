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

import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';
import {ExportModel, ExportValueBaseModel} from '../shared/export.model';
import {ActivatedRoute} from '@angular/router';
import {ExportService} from '../shared/export.service';
import {ExportDataService} from '../../../widgets/shared/export-data.service';
import {
    LastValuesRequestElementInfluxModel,
    LastValuesRequestElementTimescaleModel,
    TimeValuePairModel
} from '../../../widgets/shared/export-data.model';
import {map} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import {BrokerExportService} from '../shared/broker-export.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {environment} from '../../../../environments/environment';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ClipboardService} from 'ngx-clipboard';

@Component({
    selector: 'senergy-export-details',
    templateUrl: './export-details.component.html',
    styleUrls: ['./export-details.component.css'],
})
export class ExportDetailsComponent implements OnInit {
    id: string | null = null;
    userId: string | null = null;
    userName: string | null = null;
    baseTopic: string | null = null;
    brokerUrl = environment.brokerExportBroker;
    ready = false;
    export = {} as ExportModel;
    displayedColumns: string[] = ['Name', 'Path', 'Type', 'LastValue', 'LastTimeStamp'];
    hasLastValues = false;
    lastValuesReady = false;
    lastValuesRequestElementModels: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];
    showPassword = false;

    constructor(
        private route: ActivatedRoute,
        private location: Location,
        private snackBar: MatSnackBar,
        private clipboardService: ClipboardService,
        private exportService: ExportService,
        private authorizationService: AuthorizationService,
        private brokerExportService: BrokerExportService,
        private exportDataService: ExportDataService,
    ) {
    }

    ngOnInit() {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id !== null) {
            if (this.brokerMode) {
                this.hasLastValues = true;
                this.displayedColumns = ['Name', 'Path', 'CopyClipboard'];
                this.authorizationService.getUserName().then((name) => (this.userName = name));
                this.userId = localStorage.getItem('sub');
                this.baseTopic = 'export/' + this.userId + '/' + this.id;
            }
            const obs = (this.brokerMode ? this.brokerExportService : this.exportService).getExport(this.id);
            obs.subscribe((resp: ExportModel | null) => {
                if (resp !== null) {
                    this.export = resp;
                }
                this.baseTopic =
                    this.export.CustomMqttBroker !== undefined
                        ? this.export?.CustomMqttBaseTopic?.slice(0, this.export?.CustomMqttBaseTopic?.length - 1) || ''
                        : this.baseTopic;

                this.export?.Values?.forEach((value) => {
                    if (this.export?.Measurement !== undefined) {
                        this.lastValuesRequestElementModels.push({
                            exportId: this.export.ID,
                            measurement: this.export?.Measurement,
                            columnName: value.Name,
                            math: undefined,
                        });
                    }
                });
                if (!this.brokerMode) {
                    this.getLatestValues().subscribe(() => (this.lastValuesReady = true));
                } else {
                    this.lastValuesReady = true;
                }
                this.ready = true;
            });
        }
    }

    refreshValues() {
        this.lastValuesReady = false;
        this.getLatestValues().subscribe(() => (this.lastValuesReady = true));
    }

    private getLatestValues(): Observable<void> {
        let ob: Observable<TimeValuePairModel[]> = of([]);
        switch (this.export.ExportDatabaseID) {
        case environment.exportDatabaseIdInternalInfluxDb:
            this.hasLastValues = true;
            ob = this.exportDataService.getLastValuesInflux(this.lastValuesRequestElementModels as LastValuesRequestElementInfluxModel[]);
            break;
        case environment.exportDatabaseIdInternalTimescaleDb:
            this.hasLastValues = true;
            ob = this.exportDataService.getLastValuesTimescale(this.lastValuesRequestElementModels);
            break;
        default:
            this.hasLastValues = false;
        }
        if (this.hasLastValues) {
            return ob.pipe(
                map((pairs) => {
                    this.export.Values.forEach((_, index) => {
                        this.export.Values[index].LastValue = pairs[index].value;
                        this.export.Values[index].LastTimeStamp = '' + pairs[index].time;
                    });
                }),
            );
        } else {
            return of();
        }
    }

    goBack() {
        this.location.back();
    }

    get brokerMode(): boolean {
        return this.id?.startsWith(BrokerExportService.ID_PREFIX) || false;
    }

    get password(): string {
        return this.showPassword
            ? this.export?.CustomMqttPassword !== undefined
                ? this.export?.CustomMqttPassword
                : 'Your SENERGY password'
            : '●●●●●';
    }

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    copyClipboard(element: ExportValueBaseModel) {
        this.clipboardService.copyFromContent(((this.baseTopic || '').length > 0 ? this.baseTopic + '/' : '') + element.Name);
        this.snackBar.open('Topic copied to clipboard', undefined, {
            duration: 2000,
        });
    }
}
