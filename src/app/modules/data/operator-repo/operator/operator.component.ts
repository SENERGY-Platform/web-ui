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
import { concat, defer, EMPTY, Observable } from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';
import { OperatorModel, OperatorVersionBody, OperatorVersionModel } from '../shared/operator.model';
import { ActivatedRoute, Router } from '@angular/router';
import { OperatorRepoService } from '../shared/operator-repo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { PermissionsService } from '../../../permissions/shared/permissions.service';
import { PermissionsUserModel } from '../../../permissions/shared/permissions-user.model';
import {PermissionsV2RightsAndIdModel} from '../../../permissions/shared/permissions-resource.model';
import { deleteVersionErrorMessage } from '../shared/operator-delete-error';
import {
    bumpVersionLabel,
    classifyChange,
    compareVersionLabels,
    highestVersionLabel,
    isValidVersionLabel,
    newestVersionLabel,
    VersionData,
    versionsNewestFirst,
} from '../shared/operator-version';
import { hasBlockingRows, stateMatcher } from '../shared/operator-validation';

/** The fields a change to which is saved as a new version. */
const VERSIONED_KEYS = ['image', 'inputs', 'outputs', 'config_values'] as const;
/** The fields that are saved with the operator itself. */
const GENERAL_KEYS = ['name', 'description', 'deploymentType', 'cost'] as const;
/** The label an operator without versions gets for its stored state. */
const FIRST_LABEL = 'v1.0.0';

function clone<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/** The repository answered the operator save with an error that was already shown. */
class SaveRefused extends Error {}

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

    /** The label the user typed; without one the proposal from the change is used. */
    private labelOverride: string | undefined = undefined;
    versionBusy = false;
    readonly labelMatcher: ErrorStateMatcher = stateMatcher(() => this.versionLabelError() !== '');
    readonly imageMatcher: ErrorStateMatcher = stateMatcher(() => this.imageProblem() !== '');

    constructor(
        private route: ActivatedRoute,
        private router: Router,
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

    /** The label of the newest version for the header, or undefined without versions. */
    get currentVersion(): string | undefined {
        return newestVersionLabel(this.operator);
    }

    portsSummary(version: OperatorVersionModel): string {
        return `${version.inputs?.length ?? 0} in, ${version.outputs?.length ?? 0} out, ${version.config_values?.length ?? 0} config`;
    }

    private generalState(op: OperatorModel): string {
        return JSON.stringify({
            name: op.name ?? '',
            description: op.description ?? '',
            deploymentType: op.deploymentType ?? '',
            cost: op.cost ?? null,
        });
    }

    private topLevelState(op: OperatorModel): string {
        return JSON.stringify([(op.image ?? '').trim(), op.inputs ?? [], op.outputs ?? [], op.config_values ?? []]);
    }

    /** Unsaved edits to name, description, deployment type or cost. */
    get generalDirty(): boolean {
        return this.generalState(this.operator) !== this.generalState(this.baseline);
    }

    /** Unsaved edits to image, ports or config. */
    get topLevelDirty(): boolean {
        return this.topLevelState(this.operator) !== this.topLevelState(this.baseline);
    }

    get dirty(): boolean {
        return this.generalDirty || this.topLevelDirty;
    }

    /** Whether saving writes a version: image, ports or config of a stored operator changed. */
    get versionChange(): boolean {
        return this.isExisting && this.topLevelDirty;
    }

    /** Whether the stored state becomes v1.0.0 first: the operator has no version yet but an image. */
    get adopts(): boolean {
        return !this.hasVersions && (this.baseline.image ?? '').trim() !== '';
    }

    private versionData(op: OperatorModel): VersionData {
        return {
            image: (op.image ?? '').trim(),
            inputs: op.inputs ?? [],
            outputs: op.outputs ?? [],
            config_values: op.config_values ?? [],
        };
    }

    /** The label for the change: the highest label (v1.0.0 after the adoption) raised by the size of the change. */
    get proposedLabel(): string {
        const kind = classifyChange(this.versionData(this.baseline), this.versionData(this.operator));
        const base = highestVersionLabel(this.operator) ?? (this.adopts ? FIRST_LABEL : undefined);
        return base === undefined ? FIRST_LABEL : bumpVersionLabel(base, kind);
    }

    get versionLabel(): string {
        return this.labelOverride ?? this.proposedLabel;
    }

    set versionLabel(label: string) {
        this.labelOverride = label;
    }

    versionLabelError(): string {
        const label = this.versionLabel.trim();
        if (!isValidVersionLabel(label)) {
            return 'Use the form v1.2.3, without leading zeros or suffix';
        }
        const taken = (this.operator.versions ?? []).some(version => version.version === label) || (this.adopts && label === FIRST_LABEL);
        if (taken) {
            return `Version ${label} exists already`;
        }
        // The top level follows the current version, so a lower label would be stored but the change would not show.
        const current = newestVersionLabel(this.operator) ?? (this.adopts ? FIRST_LABEL : undefined);
        return current !== undefined && compareVersionLabels(label, current) < 0 ? `Must be above ${current}, the current version` : '';
    }

    /** Why the image stops a version from being saved, empty if it does not. */
    imageProblem(): string {
        if (!this.versionChange) {
            return '';
        }
        const image = (this.operator.image ?? '').trim();
        if (image === '') {
            return 'Image is required';
        }
        if (image === (this.baseline.image ?? '').trim()) {
            return 'Ports describe the image: a new version needs a new image';
        }
        const owner = (this.operator.versions ?? []).find(version => version.image === image);
        return owner === undefined ? '' : `Image belongs to ${owner.version} already, an image fits one version only`;
    }

    /** Everything is read-only for a user without write permission and while a save or a version write with its reload is in flight. */
    get readOnly(): boolean {
        return !this.userHasWritePermission() || this.isSaving || this.versionBusy;
    }

    /** Whether version writes are blocked: one is in flight (including its reload), the operator is being saved, or the reload would drop edits. */
    get versionActionsBlocked(): boolean {
        return !this.userHasWritePermission() || this.versionBusy || this.isSaving || this.topLevelDirty;
    }

    get nameMissing(): boolean {
        return !this.operator.name?.trim();
    }

    /** Whether a port or config row stops the save: an incomplete one or a duplicate the edit introduced. */
    get hasBlockingRows(): boolean {
        const before = this.baseline;
        return hasBlockingRows(this.operator.inputs, before.inputs) || hasBlockingRows(this.operator.outputs, before.outputs) ||
            hasBlockingRows(this.operator.config_values, before.config_values);
    }

    get valid(): boolean {
        if (this.versionChange && (this.versionLabelError() !== '' || this.imageProblem() !== '')) {
            return false;
        }
        return !this.nameMissing && !this.hasBlockingRows;
    }

    readonly nameMatcher: ErrorStateMatcher = stateMatcher(() => this.nameMissing && this.dirty);

    /** Restores what was loaded or last saved. */
    discardChanges() {
        for (const key of [...GENERAL_KEYS, ...VERSIONED_KEYS]) {
            (this.operator as any)[key] = clone(this.baseline[key]);
        }
        this.labelOverride = undefined;
    }

    /**
     * The operator as sent to the repository without a version. With versions it carries no image, ports or config, because
     * the repository refuses a top level that differs from the newest version; without versions it carries the stored ones,
     * because an absent field would clear them.
     */
    private metadataBody(source: OperatorModel, versioned: boolean): OperatorModel {
        const op = Object.assign({}, source);
        for (const key of VERSIONED_KEYS) {
            if (versioned) {
                delete (op as Partial<OperatorModel>)[key];
            } else {
                (op as any)[key] = clone(this.baseline[key]);
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
        if (this.isExisting) {
            this.saveExisting(sent);
            return;
        }
        this.saveNew(sent);
    }

    /**
     * Creates the operator, then writes it as v1.0.0 if it has an image, reads it again and opens it under its id.
     * An older repository answers without an id; the operator is created but cannot be given a version from here.
     */
    private saveNew(sent: OperatorModel) {
        let id: string | undefined;
        const image = (sent.image ?? '').trim();
        const steps: Observable<unknown>[] = [
            this.operatorService.saveOperator(Object.assign({}, sent)).pipe(map(resp => {
                if (!resp) {
                    throw new SaveRefused();
                }
                const answered = (resp.body as {_id?: unknown} | null | undefined)?._id;
                id = typeof answered === 'string' && answered !== '' ? answered : undefined;
                sent._id = id;
                this.baseline = sent;
                this.operator._id = id;
                return resp;
            })),
            defer(() => {
                if (id === undefined || image === '') {
                    return EMPTY;
                }
                const version = this.versionBody(sent);
                return this.operatorService.putOperatorVersion(id, FIRST_LABEL, version).pipe(
                    tap(() => this.takeOverVersion(FIRST_LABEL, version)),
                );
            }),
            defer(() => id === undefined ? EMPTY : this.operatorService.getOperator(id)).pipe(
                tap(resp => {
                    if (resp !== null) {
                        this.takeOverVersions(resp);
                    }
                }),
            ),
        ];
        concat(...steps).pipe(finalize(() => (this.isSaving = false))).subscribe({
            complete: () => {
                if (id === undefined) {
                    this.snackBar.open('Created. Open the operator again to manage versions.', undefined, {duration: 4000});
                    return;
                }
                this.snackBar.open(image === '' ? 'Operator saved' : `Operator saved as ${FIRST_LABEL}`, undefined, {duration: 2000});
                this.router.navigate(['/data/operator-repo/op', id], {replaceUrl: true});
            },
            error: (error: unknown) => {
                if (!(error instanceof SaveRefused)) {
                    this.snackBar.open(`Operator created, ${FIRST_LABEL} not written. ${this.putErrorMessage(error as HttpErrorResponse, FIRST_LABEL)}`,
                        'close', {duration: 8000});
                }
            },
        });
    }

    /**
     * Writes the stored state as v1.0.0 if the operator has no version, then the change as a version, then name and the like,
     * then reads the operator again. Each step that went through is taken over, so after an error the edits stay and a retry
     * does not repeat it.
     */
    private saveExisting(sent: OperatorModel) {
        const id = sent._id as string;
        const label = this.versionLabel.trim();
        const writesVersion = this.versionChange;
        const adopt = writesVersion && this.adopts;
        const stored = clone(this.baseline);
        const metadata = this.generalDirty;
        const versioned = this.hasVersions || writesVersion;
        let writing = '';
        let wrote = false;

        const steps: Observable<unknown>[] = [];
        if (adopt) {
            steps.push(defer(() => {
                writing = FIRST_LABEL;
                const version = this.versionBody(stored);
                return this.operatorService.putOperatorVersion(id, FIRST_LABEL, version).pipe(
                    tap(() => this.takeOverVersion(FIRST_LABEL, version)),
                );
            }));
        }
        if (writesVersion) {
            steps.push(defer(() => {
                writing = label;
                const version = this.versionBody(sent);
                return this.operatorService.putOperatorVersion(id, label, version).pipe(
                    tap(() => {
                        wrote = true;
                        this.takeOverVersion(label, version);
                        for (const key of VERSIONED_KEYS) {
                            (this.baseline as any)[key] = clone(sent[key]);
                        }
                    }),
                );
            }));
        }
        if (metadata) {
            steps.push(defer(() => this.operatorService.saveOperator(this.metadataBody(sent, versioned)).pipe(
                map(resp => {
                    if (!resp) {
                        throw new SaveRefused();
                    }
                    for (const key of GENERAL_KEYS) {
                        (this.baseline as any)[key] = clone(sent[key]);
                    }
                    return resp;
                }),
            )));
        }
        steps.push(defer(() => this.operatorService.getOperator(id)).pipe(
            tap(resp => {
                if (resp !== null) {
                    this.takeOverVersions(resp);
                }
            }),
        ));

        concat(...steps).pipe(finalize(() => (this.isSaving = false))).subscribe({
            complete: () => {
                this.labelOverride = undefined;
                this.snackBar.open(writesVersion ? `Operator saved as ${label}` : 'Operator saved', undefined, {duration: 2000});
            },
            error: (error: unknown) => {
                if (error instanceof SaveRefused) {
                    // The service showed its message already; add what did go through.
                    if (wrote) {
                        this.snackBar.open(`Version ${label} saved, the other changes were not saved`, 'close', {duration: 8000});
                    }
                    return;
                }
                this.snackBar.open(this.putErrorMessage(error as HttpErrorResponse, writing), 'close', {duration: 8000});
            },
        });
    }

    private versionBody(data: OperatorModel): OperatorVersionBody {
        return {
            image: (data.image ?? '').trim(),
            inputs: clone(data.inputs ?? []),
            outputs: clone(data.outputs ?? []),
            config_values: clone(data.config_values ?? []),
            deprecated: false,
        };
    }

    /** Adds a version that was written to what the editor knows, so the label counts as taken before the reload. */
    private takeOverVersion(label: string, body: OperatorVersionBody) {
        for (const target of [this.operator, this.baseline]) {
            target.versions = [...(target.versions ?? []), {version: label, ...clone(body)}];
        }
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

    private writeVersion(label: string, body: OperatorVersionBody, done: string) {
        const id = this.operator._id as string;
        this.versionBusy = true;
        this.operatorService.putOperatorVersion(id, label, body).subscribe({
            next: () => {
                this.snackBar.open(done, undefined, {duration: 2000});
                this.reloadVersions();
            },
            error: (error: HttpErrorResponse) => {
                this.versionBusy = false;
                this.snackBar.open(this.putErrorMessage(error, label), 'close', {duration: 8000});
            },
        });
    }

    private putErrorMessage(error: HttpErrorResponse, label: string): string {
        if ((error.status === 400 || error.status === 409) && typeof error.error === 'string' && error.error.trim() !== '') {
            return error.error.trim();
        }
        if (error.status === 403) {
            return 'You may not change versions of this operator';
        }
        return `Could not save version ${label}`;
    }

    /**
     * Takes over what a version write changed; the user's unsaved edits to name, description and the like stay.
     * The editor is read-only (readOnly) until the answer is in, so the reload overwrites no edit to image, ports or config.
     */
    private reloadVersions() {
        const id = this.operator._id;
        if (id === undefined) {
            this.versionBusy = false;
            return;
        }
        this.operatorService.getOperator(id).pipe(finalize(() => (this.versionBusy = false))).subscribe((resp: OperatorModel | null) => {
            if (resp !== null) {
                this.takeOverVersions(resp);
            }
        });
    }

    /** Image, ports, config, versions and revision as the repository has them now; edits are blocked while this runs, so none are lost. */
    private takeOverVersions(resp: OperatorModel) {
        for (const key of [...VERSIONED_KEYS, 'versions', 'version'] as const) {
            (this.operator as any)[key] = clone(resp[key]);
            (this.baseline as any)[key] = clone(resp[key]);
        }
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
