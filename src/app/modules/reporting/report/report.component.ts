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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportModel,
    ReportResponseModel,
    TemplateModel,
    TemplateResponseModel
} from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../devices/device-instances/shared/device-instances.model';
import { HttpResponse } from '@angular/common/http';
import { Subject, switchMap, of, takeUntil } from 'rxjs';
import {
    DynamicFormGroup,
    ReportValidationError,
    buildReportObjectsForm,
    collectValidationErrors,
    reportObjectsFromForm
} from '../shared/report-object-form';
import {
    ReportObjectNode,
    buildReportObjectNodes,
    copyReportObjectItem,
    errorCountsByPath,
    findNode,
    flattenNodes,
    isContainer,
    removeReportObjectItem
} from '../shared/report-object-node';
import { REPORT_SETTINGS_PATH, ReportObjectViewService } from '../shared/report-object-view.service';

@Component({
    selector: 'senergy-reporting-new',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css'],
    providers: [ReportObjectViewService],
})
export class ReportComponent implements OnInit, OnDestroy {

    reportId: string | null = null;
    template: TemplateModel = { data: {} } as TemplateModel;
    report: ReportModel = {} as ReportModel;
    ready = false;
    templateId: string | null = null;
    allDevices: DeviceInstanceModel[] = [];
    validationErrors: ReportValidationError[] = [];
    errorCounts: Map<string, number> = new Map<string, number>();
    nodes: ReportObjectNode[] = [];
    selectedNode?: ReportObjectNode;
    treeFilter = new FormControl<string>('', { nonNullable: true });

    form = new FormGroup({
        name: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
        cron: new FormControl<string | null>(null),
        emailSubject: new FormControl<string | null>(null),
        emailText: new FormControl<string | null>(null),
        emailHTML: new FormControl<string | null>(null),
        emailReceivers: new FormArray<FormControl<string>>([]),
        data: new FormGroup<{ [key: string]: AbstractControl }>({}),
    });

    private destroy = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private deviceInstanceService: DeviceInstancesService,
        private router: Router,
        private viewService: ReportObjectViewService
    ) {
        this.reportId = this.route.snapshot.paramMap.get('reportId');
        this.templateId = this.route.snapshot.paramMap.get('templateId');
    }

    ngOnInit() {
        this.form.statusChanges.pipe(takeUntil(this.destroy)).subscribe(() => this.updateValidation());
        this.viewService.selected$.pipe(takeUntil(this.destroy))
            .subscribe((path: string) => this.selectedNode = findNode(this.nodes, path));
        this.updateValidation();
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

    ngOnDestroy() {
        this.destroy.next();
        this.destroy.complete();
    }

    get dataForm(): DynamicFormGroup {
        return this.form.controls.data;
    }

    get emailReceivers(): FormArray<FormControl<string>> {
        return this.form.controls.emailReceivers;
    }

    get settingsSelected(): boolean {
        return this.viewService.selectedPath === REPORT_SETTINGS_PATH;
    }

    isValid(): boolean {
        return this.form.valid;
    }

    selectSettings() {
        this.viewService.select(REPORT_SETTINGS_PATH);
    }

    /**
     * Opens the report object of the given path - including the objects it is nested in - and selects it.
     */
    revealObject(path: string) {
        if (path === REPORT_SETTINGS_PATH) {
            this.selectSettings();
            return;
        }
        this.viewService.reveal(path);
    }

    expandAll() {
        this.viewService.expandAll(flattenNodes(this.nodes)
            .filter((node: ReportObjectNode) => isContainer(node))
            .map((node: ReportObjectNode) => node.path));
    }

    collapseAll() {
        this.viewService.collapseAll();
    }

    copyItem(node: ReportObjectNode) {
        const path = copyReportObjectItem(node);
        this.buildNodes();
        if (path !== undefined) {
            this.revealObject(path);
        }
    }

    removeItem(node: ReportObjectNode) {
        if (!removeReportObjectItem(node)) {
            return;
        }
        const parentPath = node.parent?.path;
        this.buildNodes();
        this.revealObject(parentPath !== undefined ? parentPath : REPORT_SETTINGS_PATH);
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

    addEmailAddress() {
        this.emailReceivers.push(new FormControl<string>('', { nonNullable: true }));
    }

    deleteEmailAddress(i: number) {
        this.emailReceivers.removeAt(i);
    }

    private loadReport(reportId: string) {
        this.reportingService.getReport(reportId).pipe(
            switchMap((resp: ReportResponseModel | null) => {
                if (resp === null) {
                    return of(null);
                }
                this.report = resp.data;
                this.templateId = this.report.templateId;
                this.template.data = {
                    dataJsonString: '',
                    dataStructured: this.report.data,
                    id: '',
                    name: ''
                };
                this.patchForm(this.report);
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
                this.setDataForm();
            }
            this.ready = true;
        });
    }

    private patchForm(report: ReportModel) {
        this.form.patchValue({
            name: report.name || '',
            cron: report.cron ?? null,
            emailSubject: report.emailSubject ?? null,
            emailText: report.emailText ?? null,
            emailHTML: report.emailHTML ?? null,
        });
        this.emailReceivers.clear();
        (report.emailReceivers || []).forEach((email: string) =>
            this.emailReceivers.push(new FormControl<string>(email, { nonNullable: true }))
        );
        this.setDataForm();
    }

    private setDataForm() {
        this.form.setControl('data', buildReportObjectsForm(this.template.data?.dataStructured));
        this.buildNodes();
        this.updateValidation();
    }

    private buildNodes() {
        this.nodes = buildReportObjectNodes(this.template.data?.dataStructured, this.dataForm);
        this.selectedNode = findNode(this.nodes, this.viewService.selectedPath);
    }

    private updateValidation() {
        const errors = collectValidationErrors(this.dataForm);
        if (this.form.controls.name.invalid) {
            errors.unshift({
                path: REPORT_SETTINGS_PATH,
                field: 'Report Name',
                message: 'Report Name is required'
            });
        }
        this.validationErrors = errors;
        this.errorCounts = errorCountsByPath(errors);
    }

    private buildReport(id: string | null): ReportModel {
        const value = this.form.getRawValue();
        const report = {
            templateId: this.templateId,
            name: value.name,
            templateName: this.template.name,
            data: reportObjectsFromForm(this.template.data?.dataStructured, this.dataForm),
            cron: value.cron ?? undefined,
            emailReceivers: value.emailReceivers,
            emailSubject: value.emailSubject ?? undefined,
            emailText: value.emailText ?? undefined,
            emailHTML: value.emailHTML ?? undefined,
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
