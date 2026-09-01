/*
 * Copyright 2026 InfAI (CC SES)
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

import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { SmartServiceExtendedParameterModel } from '../../releases/shared/release.model';
import { SmartServiceReleasesService } from '../../releases/shared/release.service';
import {
    SmartServiceParameterDialogComponent,
    SmartServiceParameterDialogData,
    SmartServiceParameterDialogResult,
} from '../dialog/smart-service-parameter-dialog/smart-service-parameter-dialog.component';
import { SmartServiceInstanceModel } from './instances.model';
import { SmartServiceInstanceService } from './instances.service';
import { initParameterValues, parametersSatisfied, pruneInvalidValues, toSmartServiceParameters } from './parameters';

/** The bit of a release the parameter dialog shows as its heading */
export interface SmartServiceReleaseRef {
    id: string;
    name: string;
    description: string;
}

/**
 * Launching, editing and upgrading a smart service instance. All three come down to collecting the
 * parameters of a release and posting them, so they share one dialog and live together here rather
 * than being spelled out again on the release list and on the instance list.
 */
@Injectable({
    providedIn: 'root',
})
export class SmartServiceInstanceDialogService {
    constructor(
        private dialog: MatDialog,
        private releasesService: SmartServiceReleasesService,
        private instancesService: SmartServiceInstanceService,
        private snackBar: MatSnackBar,
    ) {}

    /**
     * Starts a new instance of the release. Emits true when one was created.
     *
     * The dialog opens before the parameters are there and shows a spinner until they arrive - the
     * repository resolves the criteria of every iot parameter against the device repository, which
     * takes long enough that waiting for it first looks like the button did nothing.
     */
    launch(release: SmartServiceReleaseRef): Observable<boolean> {
        return this.openDialog({
            title: 'Launch Smart Service',
            submitLabel: 'Launch',
            releaseName: release.name,
            releaseDescription: release.description,
            collectInfo: true,
            name: release.name,
            description: release.description,
            parameters: this.loadParameters(release.id),
        }).pipe(
            concatMap((result) => {
                if (result === undefined) {
                    return of(false);
                }
                return this.instancesService
                    .createInstance(release.id, { name: result.name, description: result.description, parameters: result.parameters })
                    .pipe(map((instance) => this.report(instance, 'Smart service started.')));
            }),
        );
    }

    /** Renames the instance and rewrites its parameters. Emits true when something was written. */
    edit(instance: SmartServiceInstanceModel): Observable<boolean> {
        const parameters = this.loadParameters(instance.release_id).pipe(
            map((loaded) => (loaded === null ? null : initParameterValues(loaded, instance.parameters).parameters)),
        );
        return this.openDialog({
            title: 'Edit Smart Service',
            submitLabel: 'Save',
            releaseName: instance.name,
            releaseDescription: '',
            collectInfo: true,
            name: instance.name,
            description: instance.description,
            parameters,
            note: 'Saving the parameters restarts the smart service and recreates its modules.',
        }).pipe(
            concatMap((result) => {
                if (result === undefined) {
                    return of(false);
                }
                return this.writeInfoIfChanged(instance, result).pipe(
                    concatMap((ok) => {
                        if (!ok) {
                            return of(false);
                        }
                        return this.instancesService
                            .updateInstanceParameters(instance.id, result.parameters)
                            .pipe(map((updated) => this.report(updated, 'Smart service saved.')));
                    }),
                );
            }),
        );
    }

    /**
     * Moves the instance onto the newer release the repository announced. A release that only changed
     * things the user does not fill in is switched over without asking; one that added a parameter, or
     * whose options no longer cover what the instance was set to, needs the form again.
     *
     * This one cannot open the dialog first: whether there is anything to ask only follows from the
     * parameters. The button on the instance shows a spinner for as long as that takes.
     */
    upgrade(instance: SmartServiceInstanceModel): Observable<boolean> {
        const newReleaseId = instance.new_release_id;
        if (!newReleaseId) {
            return of(false);
        }
        return this.loadParameters(newReleaseId).pipe(
            concatMap((parameters) => {
                if (parameters === null) {
                    return of(false);
                }
                const merged = initParameterValues(parameters, instance.parameters);
                // a carried-over value whose device is gone must not slip through the silent path
                pruneInvalidValues(merged.parameters);
                if (merged.unfilled.length === 0 && parametersSatisfied(merged.parameters)) {
                    return this.instancesService
                        .updateInstanceParameters(instance.id, toSmartServiceParameters(merged.parameters), newReleaseId)
                        .pipe(map((updated) => this.report(updated, 'Smart service upgraded.')));
                }
                return this.releasesService.getRelease(newReleaseId).pipe(
                    concatMap((release) =>
                        this.openDialog({
                            title: 'Upgrade Smart Service',
                            submitLabel: 'Upgrade',
                            releaseName: release?.name || instance.name,
                            releaseDescription: release?.description || '',
                            collectInfo: false,
                            name: instance.name,
                            description: instance.description,
                            parameters: of(merged.parameters),
                            note: 'Upgrading restarts the smart service and recreates its modules.',
                        }),
                    ),
                    concatMap((result) => {
                        if (result === undefined) {
                            return of(false);
                        }
                        return this.instancesService
                            .updateInstanceParameters(instance.id, result.parameters, newReleaseId)
                            .pipe(map((updated) => this.report(updated, 'Smart service upgraded.')));
                    }),
                );
            }),
        );
    }

    /** null means the parameters could not be loaded and the caller has already been told */
    private loadParameters(releaseId: string): Observable<SmartServiceExtendedParameterModel[] | null> {
        return this.releasesService.getReleaseParameters(releaseId).pipe(
            map((parameters) => {
                if (parameters === null) {
                    this.snackBar.open('Could not load the smart service parameters!', 'close', { panelClass: 'snack-bar-error' });
                }
                return parameters;
            }),
        );
    }

    private openDialog(data: SmartServiceParameterDialogData): Observable<SmartServiceParameterDialogResult | undefined> {
        const config = new MatDialogConfig();
        config.autoFocus = true;
        config.minWidth = '40vw';
        config.data = data;
        return this.dialog.open(SmartServiceParameterDialogComponent, config).afterClosed();
    }

    /** The name lives on a different endpoint than the parameters, and only that one restarts nothing */
    private writeInfoIfChanged(instance: SmartServiceInstanceModel, result: SmartServiceParameterDialogResult): Observable<boolean> {
        if (result.name === instance.name && result.description === instance.description) {
            return of(true);
        }
        return this.instancesService
            .updateInstanceInfo(instance.id, { name: result.name, description: result.description })
            .pipe(map((updated) => updated !== null));
    }

    /** The services report a failure through a snackbar of their own, so only success is announced here */
    private report(updated: SmartServiceInstanceModel | null, message: string): boolean {
        if (updated === null) {
            return false;
        }
        this.snackBar.open(message, undefined, { duration: 2000 });
        return true;
    }
}
