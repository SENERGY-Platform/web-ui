/*
 * Copyright 2023 InfAI (CC SES)
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

import { Component, OnInit } from '@angular/core';
import { CostService } from '../shared/cost.service';
import { CostEntryModel, CostModel } from '../shared/cost.model';
import { KeyValue } from '@angular/common';
import {Observable, forkJoin, map, mergeMap, of, concatMap} from 'rxjs';
import { BillingService } from '../shared/billing.service';
import { FormControl } from '@angular/forms';
import { DateFilterFn, MatDatepicker } from '@angular/material/datepicker';
import { BillingInformationModel } from '../shared/billing.model';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { OperatorRepoService } from '../../data/operator-repo/shared/operator-repo.service';
import { OperatorModel } from '../../data/operator-repo/shared/operator.model';
import { PipelineRegistryService } from '../../data/pipeline-registry/shared/pipeline-registry.service';
import { PipelineModel } from '../../data/pipeline-registry/shared/pipeline.model';
import { ImportInstancesService } from '../../imports/import-instances/shared/import-instances.service';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel, DeviceInstancesTotalModel } from '../../devices/device-instances/shared/device-instances.model';
import { ExportService } from '../../exports/shared/export.service';
import { ExportModel } from '../../exports/shared/export.model';
import { BrokerExportService } from '../../exports/shared/broker-export.service';
import { ReportModel } from '../../reporting/shared/reporting.model';
import { ReportingService } from '../../reporting/shared/reporting.service';

@Component({
    selector: 'senergy-cost-overview',
    templateUrl: './cost-overview.component.html',
    styleUrls: ['./cost-overview.component.css']
})
export class CostOverviewComponent implements OnInit {
    dataReady = false;
    tree: Map<string, CostModel> | undefined;
    dates: Date[] = [];
    options: BillingInformationModel[] = [];
    date = new FormControl(new Date());
    now = new Date();
    selectedBill = new FormControl();
    isAdmin = false;
    users: any[] = [];
    selectedUser = new FormControl();
    pipelines: PipelineModel[] = [];
    operators: OperatorModel[] = [];
    imports: PipelineModel[] = [];
    devices: DeviceInstanceModel[] = [];
    exports: ExportModel[] = [];
    brokerExports: ExportModel[] = [];
    reports: ReportModel[] = [];

    constructor(
        private costService: CostService,
        private billingService: BillingService,
        private authorizationService: AuthorizationService,
        private pipelineService: PipelineRegistryService,
        private operatorService: OperatorRepoService,
        private importInstancesServcies: ImportInstancesService,
        private deviceInstancesService: DeviceInstancesService,
        private exportService: ExportService,
        private brokerExportService: BrokerExportService,
        private reportingService: ReportingService,
    ) {
        this.isAdmin = this.authorizationService.userIsAdmin();
        if (this.isAdmin) {
            this.selectedUser.setValue(this.authorizationService.getUserId());
        }
    }
    ngOnInit(): void {
        const obs: Observable<any>[] = [];
        this.selectedBill.valueChanges.subscribe(tree => this.tree = tree);
        if (this.isAdmin) {
            this.selectedUser.valueChanges.pipe(mergeMap(userid => {
                this.dataReady = false;
                return this.loadForUser(userid);
            })).subscribe(() => this.dataReady = true);
            obs.push(this.authorizationService.loadAllUsers().pipe(map((users: any | { error: string }) => {
                if (users != null) {
                    this.users = users;
                } else {
                    console.error('Could not load users from Keycloak. Reason was : ', users.error);
                }
            })));
        }
        obs.push(this.loadForUser());
        forkJoin(obs).subscribe(_ => this.dataReady = true);
    }

    loadForUser(userId: string | undefined = undefined): Observable<any> {

        if (userId === this.authorizationService.getUserId()) {
            userId = undefined;
        }
        const obs: Observable<any>[] = [of(null)];
        return this.costService.getTree(userId).pipe(concatMap((res: Map<string, CostModel>) => {
            this.tree = res;
            if ((this.tree as any)['analytics'] !== undefined){
                obs[0] = this.pipelineService.getPipelines('id:asc',undefined, undefined, userId);
                obs[1] = this.operatorService.getOperators('', 9999, 0, 'name', 'asc', userId).pipe(map(r => r.operators));
            } else {
                obs[0] = of([]);
                obs[1] = of([]);
            }
            if ((this.tree as any)['imports'] !== undefined){
                obs[2] = this.importInstancesServcies.listImportInstances('', 9999, 0, 'name.asc', false);
            } else {
                obs[2] = of([]);
            }
            if ((this.tree as any)['Exports'] !== undefined){
                if (this.isAdmin && userId !== undefined) {
                    obs[3] = this.exportService.getExportsAdmin(true).pipe(map(exps => exps?.filter(exp => exp.UserId === userId)));
                } else {
                    obs[3] = this.exportService.getExports(true).pipe(map(resp => resp?.instances));
                }
            } else {
                obs[3] = of([]);
            }
            if ((this.tree as any)['MQTTExports'] !== undefined){
                obs[4] = this.brokerExportService.getExports('', 9999, 0, 'name', 'asc', true).pipe(map(brokerExports => brokerExports?.instances));
            } else {
                obs[4] = of([]);
            }
            if ((this.tree as any)['Reporting'] !== undefined){
                obs[5] = this.reportingService.getReports().pipe(map(reports => reports?.data || []));
            } else {
                obs[5] = of([]);
            }
            return forkJoin(obs).pipe(mergeMap(obsres => {
                this.pipelines = obsres[0];
                this.operators = obsres[1];
                this.imports = obsres[2];
                this.exports = obsres[3];
                this.brokerExports = obsres[4];
                this.reports = obsres[5];
                const obs2: Observable<any>[] = [of(null)];

                if (this.billingService.userHasReadAuthorization()) {
                    obs2[0] =
                        this.billingService.getAvailable(userId).pipe(map((res2) => {
                            this.dates = res2;
                        }));
                }
                return forkJoin(obs2).pipe(
                    mergeMap(_ => {
                        if (this.tree === undefined) {
                            return of({result: [], total: 0} as DeviceInstancesTotalModel);
                        }
                        const t = this.tree as any;
                        const devices = t['Devices'];
                        if (devices !== undefined) {
                            return this.deviceInstancesService.getDeviceInstances({limit: 100000, offset: 0, deviceIds: Object.keys(devices.children)});
                        }
                        return of({result: [], total: 0} as DeviceInstancesTotalModel);
                    }),
                    map((devices: DeviceInstancesTotalModel) => {
                        this.devices = devices.result;
                    })
                );
            }));
        }));
    }

    originalOrder = (_: KeyValue<string, any>, _2: KeyValue<string, any>): number => 0;

    sum(m: CostEntryModel): number {
        return (m.cpu || 0) + (m.ram || 0) + (m.storage || 0);
    }

    setMonthAndYear($event: Date, datepicker: MatDatepicker<any>) {
        let userid = this.selectedUser.value;
        if (userid === this.authorizationService.getUserId()) {
            userid = undefined;
        }
        datepicker.close();
        const now = new Date();
        if (now.getFullYear() === $event.getFullYear() && now.getMonth() === $event.getMonth()) {
            this.costService.getTree(userid).subscribe((res: Map<string, CostModel>) => {
                this.date.setValue(now);
                this.options = [];
                this.tree = res;
            });
        } else {
            this.billingService.getForMonth($event.getFullYear(), $event.getMonth() + 1, userid).subscribe((res => {
                this.date.setValue($event);
                this.options = res;
                if (this.options.length === 0) {
                    this.tree = undefined;
                } else {
                    this.selectedBill.setValue(this.options[this.options.length - 1].tree);
                }
            }));
        }
    }

    getUserid(): string | undefined {
        const userid = this.selectedUser.value;
        if (userid === this.authorizationService.getUserId()) {
            return undefined;
        }
        return userid;
    }

    get totalCost(): number {
        if (this.tree === undefined) {
            return 0;
        }
        let total = 0;
        // @ts-expect-error just checked for undefined above
        Object.keys(this.tree).forEach(k => total += this.sum(this.tree[k].month)); // tree is object not map
        return total;
    }

    dateFilter: DateFilterFn<Date|null> = (d: Date|null): boolean => {
        if (d === null) {
            return false;
        }
        const val =  d.valueOf() - d.getTimezoneOffset() * 60000;
        const found = this.dates.find(date => val === date.valueOf()) !== undefined;
        return found;
    };
}
