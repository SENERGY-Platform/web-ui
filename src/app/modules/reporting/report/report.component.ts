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

import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportJobModel,
    ReportModel,
    ReportResponseModel,
    TemplateModel,
    TemplateResponseModel
} from '../shared/reporting.model';
import { reportJobDone, reportJobFailed, reportJobLabel } from '../shared/report-job';
import { ReportingService } from '../shared/reporting.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../devices/device-instances/shared/device-instances.model';
import { DeviceGroupsService } from '../../devices/device-groups/shared/device-groups.service';
import { DeviceGroupDisplayModel } from '../../devices/device-groups/shared/device-groups.model';
import { HttpResponse } from '@angular/common/http';
import { Subject, finalize, switchMap, of, takeUntil } from 'rxjs';
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
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { ReportTreeComponent } from './report-tree/report-tree.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { SaveBarComponent } from '../../../core/components/save-bar/save-bar.component';
import { TreeDetailLayoutComponent } from '../../../core/components/tree-detail-layout/tree-detail-layout.component';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { ReportObjectComponent } from './report-object/report-object.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-reporting-new',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css'],
    providers: [ReportObjectViewService],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SpinnerComponent, MatIconButton, MatTooltip, MatIcon, MatFormField, MatLabel, MatInput, FormsModule, ReactiveFormsModule, MatSuffix, ReportTreeComponent, MatError, MatErrorMessagesDirective, MatButton, ReportObjectComponent, MatProgressBar, RouterLink, DatePipe, PageHeaderComponent, FormSectionComponent, SaveBarComponent, TreeDetailLayoutComponent]
})
export class ReportComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    snackBar = inject(MatSnackBar);
    utilsService = inject(UtilService);
    private reportingService = inject(ReportingService);
    private deviceInstanceService = inject(DeviceInstancesService);
    private deviceGroupsService = inject(DeviceGroupsService);
    private router = inject(Router);
    private viewService = inject(ReportObjectViewService);


    reportId: string | null = null;
    template: TemplateModel = { data: {} } as TemplateModel;
    report: ReportModel = {} as ReportModel;
    ready = false;
    creating = false;
    reportJob: ReportJobModel | null = null;
    templateId: string | null = null;
    allDevices: DeviceInstanceModel[] = [];
    allDeviceGroups: DeviceGroupDisplayModel[] = [];
    validationErrors: ReportValidationError[] = [];
    errorCounts: Map<string, number> = new Map<string, number>();
    nodes: ReportObjectNode[] = [];
    selectedNode?: ReportObjectNode;
    treeFilter = new FormControl<string>('', { nonNullable: true });
    /** True while the form differs from the loaded or last saved report. */
    unsaved = false;
    saving = false;
    reloading = false;

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
    /** Ends a reload of the report: when Discard starts another one. */
    private reload$ = new Subject<void>();
    /** What the form held when it was loaded or last saved; null until the report is loaded. */
    private baseline: string | null = null;
    /** A report from a template is unsaved until its first save, even if nothing was edited. */
    private stored = false;

    constructor() {
        this.reportId = this.route.snapshot.paramMap.get('reportId');
        this.templateId = this.route.snapshot.paramMap.get('templateId');
    }

    ngOnInit() {
        this.form.statusChanges.pipe(takeUntil(this.destroy)).subscribe(() => this.updateValidation());
        this.form.valueChanges.pipe(takeUntil(this.destroy)).subscribe(() => this.refreshUnsaved());
        this.viewService.selected$.pipe(takeUntil(this.destroy))
            .subscribe((path: string) => this.selectedNode = findNode(this.nodes, path));
        this.updateValidation();
        this.deviceInstanceService.getDeviceInstances({ limit: 9999, offset: 0 }).subscribe((devices) => {
            this.allDevices = devices.result;
        });
        this.deviceGroupsService.getDeviceGroups('', 9999, 0, 'name', 'asc').subscribe((groups) => {
            this.allDeviceGroups = groups.result;
        });
        if (this.reportId !== null) {
            this.loadReport(this.reportId);
            this.resumeReportJob(this.reportId);
        } else if (this.templateId !== null) {
            this.loadTemplate(this.templateId);
        } else {
            this.markLoaded();
        }
    }

    ngOnDestroy() {
        this.reload$.next();
        this.destroy.next();
        this.destroy.complete();
    }

    get dataForm(): DynamicFormGroup {
        return this.form.controls.data;
    }

    get emailReceivers(): FormArray<FormControl<string>> {
        return this.form.controls.emailReceivers;
    }

    get backLabel(): string {
        return this.reportId === null ? 'Templates' : 'Reports';
    }

    get backLink(): string {
        return this.reportId === null ? '/reporting/templates' : '/reporting/reports';
    }

    get pageTitle(): string {
        if (this.reportId === null) {
            return 'New report';
        }
        return this.form.controls.name.value || 'Unnamed report';
    }

    get pageDescription(): string {
        if (!this.template.name) {
            return '';
        }
        return (this.reportId === null ? 'New report from the template ' : 'Report from the template ') + this.template.name + '.';
    }

    /** The bar names what blocks saving, else that something changed. */
    get saveStatus(): string {
        if (this.validationErrors.length > 0) {
            return this.validationErrors.length + ' missing input(s), see the list above the form.';
        }
        return 'Unsaved changes';
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
        this.refreshUnsaved();
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
        this.refreshUnsaved();
        this.revealObject(parentPath !== undefined ? parentPath : REPORT_SETTINGS_PATH);
    }

    /**
     * Queues creation of a report file. The reporting service builds the file in the
     * background, so this returns before the file exists and the job it hands back is
     * watched for the status. For a new report the view is redirected to the edit
     * route of the created report, where the job is picked up again.
     */
    create() {
        this.creating = true;
        this.reportJob = null;
        this.reportingService.createReport(this.buildReport(this.reportId)).subscribe(resp => {
            this.creating = false;
            if (resp === null) {
                return;
            }
            this.snackBar.open('Report creation started', 'ReportCreate', {
                duration: 2000
            });
            if (this.reportId === null && resp.id !== null) {
                this.reportId = resp.id;
                this.router.navigateByUrl('/reporting/edit/' + this.reportId);
                return;
            }
            if (resp.jobId !== null) {
                this.watchReportJob(resp.jobId);
            }
        });
    }

    get reportJobLabel(): string {
        return this.reportJob === null ? '' : reportJobLabel(this.reportJob);
    }

    get reportJobFailed(): boolean {
        return this.reportJob !== null && reportJobFailed(this.reportJob);
    }

    get reportJobRunning(): boolean {
        return this.reportJob !== null && !reportJobDone(this.reportJob);
    }

    get reportJobFinished(): boolean {
        return this.reportJob !== null && reportJobDone(this.reportJob);
    }

    dismissReportJob() {
        this.reportJob = null;
    }

    /**
     * Follows a report file creation until it is finished.
     */
    private watchReportJob(jobId: string) {
        this.reportingService.pollReportJob(jobId).pipe(takeUntil(this.destroy))
            .subscribe((job: ReportJobModel | null) => this.reportJob = job);
    }

    /**
     * Picks up a report file creation that is still running, so the status survives a
     * reload and the redirect after creating a new report.
     */
    private resumeReportJob(reportId: string) {
        this.reportingService.getUnfinishedReportJob(reportId).pipe(takeUntil(this.destroy))
            .subscribe((job: ReportJobModel | null) => {
                if (job !== null) {
                    this.reportJob = job;
                    this.watchReportJob(job.id);
                }
            });
    }

    /**
     * Saves the current report to the reporting service.
     *
     * No return value, but opens a snackbar with a success message if the report is saved successfully.
     */
    save() {
        const sent = this.snapshot(null);
        this.saving = true;
        this.reportingService.saveReport(this.buildReport(null)).pipe(finalize(() => this.saving = false))
            .subscribe(resp => this.showResult(resp, 'Report saved', 'ReportSave', sent));
    }

    update() {
        const sent = this.snapshot(this.reportId);
        this.saving = true;
        this.reportingService.updateReport(this.buildReport(this.reportId)).pipe(finalize(() => this.saving = false))
            .subscribe(resp => this.showResult(resp, 'Report updated', 'ReportUpdate', sent));
    }

    /** The save bar writes a new report or updates the stored one, as the header buttons did. */
    saveChanges() {
        if (this.saving || this.reloading || !this.isValid()) {
            return;
        }
        if (this.reportId === null) {
            this.save();
        } else {
            this.update();
        }
    }

    /**
     * A new report goes back to the template list. A stored one is loaded again: a reload still in flight is
     * cancelled first, and the form is reset only once the report arrived, so a failed reload keeps the edits.
     */
    discard() {
        if (this.saving) {
            return;
        }
        if (this.reportId === null) {
            this.router.navigateByUrl('/reporting/templates');
            return;
        }
        this.reload$.next();
        this.reloading = true;
        this.reportingService.getReport(this.reportId).pipe(
            takeUntil(this.reload$),
            takeUntil(this.destroy),
            finalize(() => this.reloading = false)
        ).subscribe((resp: ReportResponseModel | null) => {
            if (resp !== null) {
                this.applyReport(resp.data);
                this.markLoaded();
            }
        });
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
                this.applyReport(resp.data);
                return this.reportingService.getTemplate(resp.data.templateId);
            })
        ).subscribe((resp: TemplateResponseModel | null) => {
            if (resp !== null) {
                this.template.name = resp.data.name;
            }
            this.markLoaded();
        });
    }

    /** Puts a stored report into the form and the tree. */
    private applyReport(report: ReportModel) {
        this.report = report;
        this.templateId = report.templateId;
        this.template.data = {
            dataJsonString: '',
            dataStructured: report.data,
            id: '',
            name: ''
        };
        this.patchForm(report);
    }

    /** The form now shows the stored state, so nothing is unsaved. */
    private markLoaded() {
        this.ready = true;
        this.baseline = this.snapshot(this.reportId);
        this.refreshUnsaved();
    }

    private snapshot(id: string | null): string {
        return JSON.stringify(this.buildReport(id));
    }

    private refreshUnsaved() {
        this.unsaved = this.baseline !== null
            && ((this.reportId === null && !this.stored) || this.snapshot(this.reportId) !== this.baseline);
    }

    private loadTemplate(templateId: string) {
        this.reportingService.getTemplate(templateId).subscribe((resp: TemplateResponseModel | null) => {
            if (resp !== null) {
                this.template = resp.data;
                this.setDataForm();
            }
            this.markLoaded();
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

    /** What was sent is now stored; edits made while the request was out stay unsaved. */
    private showResult(resp: HttpResponse<string> | null, message: string, action: string, sent: string) {
        if (resp !== null && resp.status >= 200 && resp.status < 300) {
            this.baseline = sent;
            this.stored = true;
            this.refreshUnsaved();
            this.snackBar.open(message, action, {
                duration: 2000
            });
        }
    }
}
