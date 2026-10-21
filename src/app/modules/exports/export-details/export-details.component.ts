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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {ExportModel, ExportValueBaseModel} from '../shared/export.model';
import {ActivatedRoute, RouterLink} from '@angular/router';
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
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-export-details',
    templateUrl: './export-details.component.html',
    styleUrls: ['./export-details.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton, MatIconButton, MatTooltip, MatIcon, RouterLink, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, SpinnerComponent, DatePipe, PageHeaderComponent, FormSectionComponent]
})
export class ExportDetailsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private snackBar = inject(MatSnackBar);
    private clipboardService = inject(ClipboardService);
    private exportService = inject(ExportService);
    private permissionsService = inject(PermissionsService);
    private authorizationService = inject(AuthorizationService);
    private brokerExportService = inject(BrokerExportService);
    private exportDataService = inject(ExportDataService);

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
    /** Whether the Edit action is offered: the same two conditions as the Edit entry of the export list. */
    canEdit = false;

    ngOnInit() {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id !== null) {
            const id = this.id;
            if (this.exportService.userHasUpdateAuthorization()) {
                this.permissionsService.getComputedResourcePermissionsV2('export-instances', [id])
                    .subscribe((permissions) => (this.canEdit = permissions.find((p) => p.id === id)?.write === true));
            }
            if (this.brokerMode) {
                this.hasLastValues = true;
                this.displayedColumns = ['Name', 'Path', 'CopyClipboard'];
                this.userName = this.authorizationService.getUserName();
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

    get listLink(): string {
        return this.brokerMode ? '/exports/broker' : '/exports/db';
    }

    /** What the export reads from, as the list names it. */
    get sourceLabel(): string {
        switch (this.export.FilterType) {
        case 'deviceId':
            return 'Device';
        case 'pipeId':
        case 'operatorId':
            return 'Pipeline';
        case 'import_id':
            return 'Import';
        default:
            return 'Source';
        }
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
        snackSuccess(this.snackBar, 'Topic copied to clipboard');
    }
}
