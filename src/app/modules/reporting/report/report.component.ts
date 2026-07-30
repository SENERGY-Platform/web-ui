/*
 * Copyright 2024 InfAI (CC SES)
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportModel,
    ReportObjectModel,
    ReportResponseModel,
    TemplateModel,
    TemplateResponseModel
} from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../devices/device-instances/shared/device-instances.model';
import { HttpResponse } from '@angular/common/http';
import { switchMap, of } from 'rxjs';

@Component({
    selector: 'senergy-reporting-new',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css'],
})
export class ReportComponent implements OnInit {

    reportName = '';
    reportId: string | null = null;
    template: TemplateModel = { data: {} } as TemplateModel;
    report: ReportModel = {} as ReportModel;
    ready = false;
    templateId: string | null = null;
    allDevices: DeviceInstanceModel[] = [];
    cron: string | undefined;
    emailReceivers?: string[];
    emailSubject?: string;
    emailText?: string;
    emailHTML?: string;

    constructor(
        private route: ActivatedRoute,
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private deviceInstanceService: DeviceInstancesService,
        private router: Router
    ) {
        this.reportId = this.route.snapshot.paramMap.get('reportId');
        this.templateId = this.route.snapshot.paramMap.get('templateId');
    }

    ngOnInit() {
        this.deviceInstanceService.getDeviceInstances({ limit: 9999, offset: 0 }).subscribe((devices) => {
            this.allDevices = devices.result;
        });
        if (this.reportId !== null) {
            this.loadReport(this.reportId);
        } else if (this.templateId !== null) {
            this.loadTemplate(this.templateId);
        } else {
            this.ready = true;
        }
    }

    /**
     * Creates the report in the reporting service. For a new report the view is redirected to the
     * edit route of the created report.
     */
    create() {
        this.ready = false;
        this.reportingService.createReport(this.buildReport(this.reportId)).subscribe(resp => {
            this.ready = true;
            if (resp === null) {
                return;
            }
            this.snackBar.open('Report created', 'ReportCreate', {
                duration: 2000
            });
            if (this.reportId === null && resp.id !== null) {
                this.reportId = resp.id;
                this.router.navigateByUrl('/reporting/edit/' + this.reportId);
            }
        });
    }

    /**
     * Saves the current report to the reporting service.
     *
     * No return value, but opens a snackbar with a success message if the report is saved successfully.
     */
    save() {
        this.reportingService.saveReport(this.buildReport(null))
            .subscribe(resp => this.showResult(resp, 'Report saved', 'ReportSave'));
    }

    update() {
        this.reportingService.updateReport(this.buildReport(this.reportId))
            .subscribe(resp => this.showResult(resp, 'Report updated', 'ReportUpdate'));
    }

    trackByIndex(index: number, _: any) {
        return index;
    }

    trackByKey(_: number, item: { key: string }) {
        return item.key;
    }

    addEmailAddress() {
        if (this.emailReceivers === undefined || this.emailReceivers === null) {
            this.emailReceivers = [''];
        } else {
            this.emailReceivers.push('');
        }
    }

    deleteEmailAddress(i: number) {
        if (this.emailReceivers === undefined || this.emailReceivers === null) {
            return;
        }
        this.emailReceivers.splice(i, 1);
    }

    isValid(): boolean {
        return this.reportName.trim().length > 0;
    }

    private loadReport(reportId: string) {
        this.reportingService.getReport(reportId).pipe(
            switchMap((resp: ReportResponseModel | null) => {
                if (resp === null) {
                    return of(null);
                }
                this.report = resp.data;
                this.templateId = this.report.templateId;
                this.reportName = this.report.name;
                this.cron = this.report.cron;
                this.emailReceivers = this.report.emailReceivers;
                this.emailSubject = this.report.emailSubject;
                this.emailText = this.report.emailText;
                this.emailHTML = this.report.emailHTML;
                this.template.data = {
                    dataJsonString: '',
                    dataStructured: this.report.data,
                    id: '',
                    name: ''
                };
                return this.reportingService.getTemplate(this.templateId);
            })
        ).subscribe((resp: TemplateResponseModel | null) => {
            if (resp !== null) {
                this.template.name = resp.data.name;
            }
            this.ready = true;
        });
    }

    private loadTemplate(templateId: string) {
        this.reportingService.getTemplate(templateId).subscribe((resp: TemplateResponseModel | null) => {
            if (resp !== null) {
                this.template = resp.data;
            }
            this.ready = true;
        });
    }

    private buildReport(id: string | null): ReportModel {
        const report = {
            templateId: this.templateId,
            name: this.reportName,
            templateName: this.template.name,
            data: this.template.data?.dataStructured as Map<string, ReportObjectModel>,
            cron: this.cron,
            emailReceivers: this.emailReceivers,
            emailSubject: this.emailSubject,
            emailText: this.emailText,
            emailHTML: this.emailHTML,
        } as ReportModel;
        if (id !== null) {
            report.id = id;
        }
        return report;
    }

    private showResult(resp: HttpResponse<string> | null, message: string, action: string) {
        if (resp !== null && resp.status >= 200 && resp.status < 300) {
            this.snackBar.open(message, action, {
                duration: 2000
            });
        }
    }
}
