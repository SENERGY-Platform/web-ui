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

import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorStateMatcher } from '@angular/material/core';
import { finalize } from 'rxjs/operators';
import { IOModel, OperatorModel, OperatorVersionModel } from '../shared/operator.model';
import { ActivatedRoute } from '@angular/router';
import { OperatorRepoService } from '../shared/operator-repo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { PermissionsService } from '../../../permissions/shared/permissions.service';
import { PermissionsUserModel } from '../../../permissions/shared/permissions-user.model';
import {PermissionsV2RightsAndIdModel} from '../../../permissions/shared/permissions-resource.model';
import { deleteVersionErrorMessage } from '../shared/operator-delete-error';
import { isValidVersionLabel, nextVersionLabel, versionsNewestFirst } from '../shared/operator-version';
import { hasBlockingRows, stateMatcher } from '../shared/operator-validation';

/** The fields a version replaces on the operator; with versions they are changed through versions only. */
const VERSIONED_KEYS = ['image', 'inputs', 'outputs', 'config_values'] as const;

/** The form of the version that is being added. */
export interface NewVersionForm {
    label: string;
    image: string;
    inputs: IOModel[];
    outputs: IOModel[];
    config_values: IOModel[];
}

function clone<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

@Component({
    selector: 'senergy-operator',
    templateUrl: './operator.component.html',
    styleUrls: ['./operator.component.css'],
})
export class OperatorComponent implements OnInit {
    operator = {} as OperatorModel;
    userId: string | Error = '';
    shareUser: string | undefined = undefined;
    isSaving = false;

    permissionsPerOperator?: PermissionsV2RightsAndIdModel[];

    /** The operator as loaded or last saved, to tell unsaved changes and to restore them. */
    private baseline = {} as OperatorModel;

    addingVersion = false;
    newVersion: NewVersionForm = {label: '', image: '', inputs: [], outputs: [], config_values: []};
    versionBusy = false;
    readonly labelMatcher: ErrorStateMatcher = stateMatcher(() => this.versionLabelError() !== '');
    readonly imageMatcher: ErrorStateMatcher = stateMatcher(() => this.versionImageError() !== '');

    constructor(
        private route: ActivatedRoute,
        private operatorService: OperatorRepoService,
        public snackBar: MatSnackBar,
        protected auth: AuthorizationService,
        protected permission: PermissionsService,
        private dialogs: DialogsService,
    ) {}

    ngOnInit() {
        this.userId = this.auth.getUserId();
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.permissionsPerOperator = [];
            this.operatorService.getOperator(id).subscribe((resp: OperatorModel | null) => {
                if (resp !== null) {
                    this.operator = resp;
                    this.baseline = clone(resp);
                    if (this.operator.userId !== undefined && this.userId !== this.operator.userId) {
                        this.permission.getUserById(this.operator.userId).subscribe((response: PermissionsUserModel) => {
                            this.shareUser = response.username;
                        });
                    }
                    this.loadOperatorPermissions();
                }
            });
        }
    }

    /** The operator as loaded or last saved. */
    get saved(): OperatorModel {
        return this.baseline;
    }

    get hasVersions(): boolean {
        return (this.operator.versions?.length ?? 0) > 0;
    }

    get isExisting(): boolean {
        return this.operator._id !== undefined;
    }

    get versions(): OperatorVersionModel[] {
        return versionsNewestFirst(this.operator);
    }

    /** Name, description, cost and deployment type, plus image and ports as long as no version owns them. */
    private editableState(op: OperatorModel): string {
        const general = {
            name: op.name ?? '',
            description: op.description ?? '',
            deploymentType: op.deploymentType ?? '',
            cost: op.cost ?? null,
        };
        const versioned = this.hasVersions ? {} : {
            image: op.image ?? '',
            inputs: op.inputs ?? [],
            outputs: op.outputs ?? [],
            config_values: op.config_values ?? [],
        };
        return JSON.stringify({...general, ...versioned});
    }

    get dirty(): boolean {
        return this.editableState(this.operator) !== this.editableState(this.baseline);
    }

    private topLevelState(op: OperatorModel): string {
        return JSON.stringify([op.image ?? '', op.inputs ?? [], op.outputs ?? [], op.config_values ?? []]);
    }

    /** Unsaved edits to image, ports or config; a version write re-reads these from the repository, so they would be lost. */
    get topLevelDirty(): boolean {
        return this.topLevelState(this.operator) !== this.topLevelState(this.baseline);
    }

    /** Everything is read-only for a user without write permission and while a save is in flight. */
    get readOnly(): boolean {
        return !this.userHasWritePermission() || this.isSaving;
    }

    /** Image, ports and config belong to the versions, and to the add-version form while it is open. */
    get topLevelLocked(): boolean {
        return this.readOnly || this.hasVersions || this.addingVersion;
    }

    /** The hint under a top-level block, naming what it is, e.g. "the inputs". */
    topLevelHint(what: string): string {
        if (this.hasVersions) {
            return `Changed through versions: ${what} of the newest version.`;
        }
        return this.addingVersion ? `Locked while a version is being added: the form below sets ${what}.` : '';
    }

    /** Whether version writes are blocked: one is in flight (including its reload), or the operator is being saved. */
    get versionActionsBlocked(): boolean {
        return !this.userHasWritePermission() || this.versionBusy || this.isSaving;
    }

    get nameMissing(): boolean {
        return !this.operator.name?.trim();
    }

    /** Whether a port or config row stops the save: an incomplete one or a duplicate the edit introduced. Versioned operators do not edit them here. */
    get hasBlockingRows(): boolean {
        if (this.hasVersions) {
            return false;
        }
        const before = this.baseline;
        return hasBlockingRows(this.operator.inputs, before.inputs) || hasBlockingRows(this.operator.outputs, before.outputs) ||
            hasBlockingRows(this.operator.config_values, before.config_values);
    }

    get valid(): boolean {
        return !this.nameMissing && !this.hasBlockingRows;
    }

    readonly nameMatcher: ErrorStateMatcher = stateMatcher(() => this.nameMissing && this.dirty);

    /** Restores what was loaded or last saved. */
    discardChanges() {
        for (const key of ['name', 'description', 'deploymentType', 'cost'] as const) {
            (this.operator as any)[key] = clone(this.baseline[key]);
        }
        if (!this.hasVersions) {
            for (const key of VERSIONED_KEYS) {
                (this.operator as any)[key] = clone(this.baseline[key]);
            }
        }
    }

    /** The operator as sent on save; with versions the repository refuses a top level that differs from the newest version. */
    saveBody(source: OperatorModel = this.operator): OperatorModel {
        const op = Object.assign({}, source);
        if (this.hasVersions) {
            for (const key of VERSIONED_KEYS) {
                delete (op as Partial<OperatorModel>)[key];
            }
        }
        return op;
    }

    saveOperator() {
        if (!this.valid || this.isSaving || this.versionBusy) {
            return;
        }
        this.isSaving = true;
        // What was sent is what counts as saved, whatever the operator looks like when the answer arrives.
        const sent = clone(this.operator);
        this.operatorService.saveOperator(this.saveBody(sent)).pipe(finalize(() => (this.isSaving = false))).subscribe((resp) => {
            if (resp) {
                this.baseline = sent;
                this.snackBar.open('Operator saved', undefined, {
                    duration: 2000,
                });
            }
        });
    }

    startAddVersion() {
        if (this.topLevelDirty) {
            return;
        }
        this.newVersion = {
            label: nextVersionLabel(this.operator),
            image: this.operator.image ?? '',
            inputs: clone(this.operator.inputs ?? []),
            outputs: clone(this.operator.outputs ?? []),
            config_values: clone(this.operator.config_values ?? []),
        };
        this.addingVersion = true;
    }

    cancelAddVersion() {
        this.addingVersion = false;
    }

    versionLabelError(): string {
        const label = this.newVersion.label.trim();
        if (!isValidVersionLabel(label)) {
            return 'Use the form v1.2.3, without leading zeros or suffix';
        }
        if ((this.operator.versions ?? []).some(version => version.version === label)) {
            return `Version ${label} exists already`;
        }
        return '';
    }

    versionImageError(): string {
        const image = this.newVersion.image.trim();
        if (image === '') {
            return 'Image is required';
        }
        const owner = (this.operator.versions ?? []).find(version => version.image === image);
        return owner === undefined ? '' : `Image belongs to ${owner.version} already, an image fits one version only`;
    }

    get newVersionValid(): boolean {
        return this.versionLabelError() === '' && this.versionImageError() === '' &&
            [this.newVersion.inputs, this.newVersion.outputs, this.newVersion.config_values]
                .every(list => !hasBlockingRows(list, undefined));
    }

    saveVersion() {
        if (!this.newVersionValid || this.versionActionsBlocked || this.operator._id === undefined) {
            return;
        }
        const form = this.newVersion;
        const label = form.label.trim();
        this.writeVersion(label, {
            image: form.image.trim(),
            inputs: form.inputs,
            outputs: form.outputs,
            config_values: form.config_values,
            deprecated: false,
        }, `Version ${label} added`, () => (this.addingVersion = false));
    }

    toggleDeprecated(version: OperatorVersionModel) {
        if (this.versionActionsBlocked || this.operator._id === undefined) {
            return;
        }
        const deprecated = !version.deprecated;
        this.writeVersion(version.version, {
            image: version.image,
            inputs: version.inputs ?? [],
            outputs: version.outputs ?? [],
            config_values: version.config_values ?? [],
            deprecated,
        }, `Version ${version.version} ${deprecated ? 'deprecated' : 'undeprecated'}`);
    }

    deleteVersion(version: OperatorVersionModel) {
        const id = this.operator._id;
        if (this.versionActionsBlocked || id === undefined) {
            return;
        }
        this.dialogs.openDeleteDialog(`version ${version.version}`).afterClosed().subscribe((confirmed: boolean) => {
            if (!confirmed) {
                return;
            }
            this.versionBusy = true;
            this.operatorService.deleteOperatorVersion(id, version.version).subscribe({
                next: () => {
                    this.snackBar.open(`Version ${version.version} deleted`, undefined, {duration: 2000});
                    this.reloadVersions();
                },
                error: (error: HttpErrorResponse) => {
                    this.versionBusy = false;
                    this.snackBar.open(deleteVersionErrorMessage(error, version.version), 'close', {duration: 8000});
                },
            });
        });
    }

    private writeVersion(label: string, body: Parameters<OperatorRepoService['putOperatorVersion']>[2], done: string, onSuccess?: () => void) {
        const id = this.operator._id as string;
        this.versionBusy = true;
        this.operatorService.putOperatorVersion(id, label, body).subscribe({
            next: () => {
                this.snackBar.open(done, undefined, {duration: 2000});
                this.reloadVersions(onSuccess);
            },
            error: (error: HttpErrorResponse) => {
                this.versionBusy = false;
                this.snackBar.open(this.putErrorMessage(error, label), 'close', {duration: 8000});
            },
        });
    }

    private putErrorMessage(error: HttpErrorResponse, label: string): string {
        if (error.status === 400 && typeof error.error === 'string' && error.error.trim() !== '') {
            return error.error.trim();
        }
        if (error.status === 403) {
            return 'You may not change versions of this operator';
        }
        return `Could not save version ${label}`;
    }

    /**
     * Takes over what a version write changed; the user's unsaved edits to name, description and the like stay.
     * The operator stays busy until the answer is in, so nothing is edited, saved or written in between.
     */
    private reloadVersions(afterwards?: () => void) {
        const id = this.operator._id;
        if (id === undefined) {
            this.versionBusy = false;
            return;
        }
        this.operatorService.getOperator(id).pipe(finalize(() => {
            this.versionBusy = false;
            afterwards?.();
        })).subscribe((resp: OperatorModel | null) => {
            if (resp === null) {
                return;
            }
            for (const key of [...VERSIONED_KEYS, 'versions', 'version'] as const) {
                (this.operator as any)[key] = clone(resp[key]);
                (this.baseline as any)[key] = clone(resp[key]);
            }
        });
    }

    loadOperatorPermissions() {
        const id = this.operator._id;
        if (id != undefined){
            this.permission.getComputedResourcePermissionsV2('analytics-operators', [id]).subscribe(
                perms => (this.permissionsPerOperator = perms)
            );
        }
    }

    userHasWritePermission(): boolean {
        if (this.permissionsPerOperator === undefined) {
            // user is creating operator
            return true;
        }
        return this.permissionsPerOperator[0]?.write || false;
    }
}
