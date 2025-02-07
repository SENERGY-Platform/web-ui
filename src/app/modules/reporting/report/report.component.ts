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
    templateId: string | null = '';
    requestObject: Map<string, any> = new Map<string, any>();
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
        this.deviceInstanceService.getDeviceInstances({ limit: 9999, offset: 0 }).subscribe((devices) => {
            this.allDevices = devices.result;
        });
    }

    ngOnInit() {
        if (this.reportId != null) {
            this.reportingService.getReport(this.reportId).subscribe((resp: ReportResponseModel | null) => {
                if (resp !== null) {
                    this.report = resp.data;
                    this.templateId = this.report.templateId;
                    this.reportName = this.report.name;
                    this.cron = this.report.cron;
                    this.emailReceivers = this.report.emailReceivers;
                    this.emailSubject = this.report.emailSubject;
                    this.emailText = this.report.emailText;
                    this.emailHTML = this.report.emailHTML;
                    this.template.data = { dataJsonString: '', dataStructured: {} as Map<string, ReportObjectModel>, id: '', name: '' };
                    this.template.data.dataStructured = this.report.data;
                    this.reportingService.getTemplate(this.templateId).subscribe((resp2: TemplateResponseModel | null) => {
                        if (resp2 !== null) {
                            this.template.name = resp2.data.name;
                        }
                        this.ready = true;
                    });
                }
            });
        }
        if (this.templateId != null) {
            this.reportingService.getTemplate(this.templateId).subscribe((resp: TemplateResponseModel | null) => {
                if (resp !== null) {
                    this.template = resp.data;
                }
                this.ready = true;
            });
        }
    }

    create() {
        this.ready=false;
        this.reportingService.createReport({
            id: this.reportId, templateId: this.templateId, name: this.reportName,
            templateName: this.template.name, data: this.template.data?.dataStructured,
            cron: this.cron, emailReceivers: this.emailReceivers,
            emailSubject: this.emailSubject,
            emailText: this.emailText,
            emailHTML: this.emailHTML,
        } as ReportModel).subscribe(resp => {
            if (resp !== null) {
                this.snackBar.open('Report created', 'ReportCreate', {
                    duration: 2000
                });
                this.ready=true;
                if (this.reportId == null) {
                    this.reportId = resp.id;
                    this.router.navigateByUrl('/reporting/edit/' + this.reportId);
                }
            }
        });
    }

    /**
     * Saves the current report to the reporting service.
     *
     * No return value, but opens a snackbar with a success message if the report is saved successfully.
     */
    save() {
        this.reportingService.saveReport({
            templateId: this.templateId, name: this.reportName,
            templateName: this.template.name, data: this.template.data?.dataStructured,
            cron: this.cron, emailReceivers: this.emailReceivers,
            emailSubject: this.emailSubject,
            emailText: this.emailText,
            emailHTML: this.emailHTML,
        } as ReportModel).subscribe(resp => {
            if (resp !== null) {
                if (resp.status === 200) {
                    this.snackBar.open('Report saved', 'ReportSave', {
                        duration: 2000
                    });
                }
            }
        });
    }

    update() {
        this.reportingService.updateReport({
            id: this.reportId, templateId: this.templateId, name: this.reportName,
            templateName: this.template.name, data: this.template.data?.dataStructured,
            cron: this.cron, emailReceivers: this.emailReceivers,
            emailSubject: this.emailSubject,
            emailText: this.emailText,
            emailHTML: this.emailHTML,
        } as ReportModel).subscribe(resp => {
            if (resp !== null) {
                if (resp.status === 200) {
                    this.snackBar.open('Report updated', 'ReportUpdate', {
                        duration: 2000
                    });
                }
            }
        });
    }

    trackByIndex(index: number, _: any) {
        return index;
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
}
