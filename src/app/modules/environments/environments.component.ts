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

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { EnvironmentsService } from './shared/environments.service';
import { DialogsService } from '../../core/services/dialogs.service';
import { ApiError, Environment, ValidationError, environmentTypeLabel, isApiError, isValidationError } from './shared/environments.model';
import { countEnvironmentEntities, EnvironmentEntityCounts } from './shared/environments-count';
import { EnvironmentsCreateDialogComponent } from './dialogs/environments-create-dialog.component';

/** One row of the table: the environment plus its counts, computed once per reload. */
export interface EnvironmentRow {
    environment: Environment;
    counts: EnvironmentEntityCounts;
}

@Component({
    selector: 'senergy-environments',
    templateUrl: './environments.component.html',
    styleUrls: ['./environments.component.css'],
})
export class EnvironmentsComponent implements OnInit {
    displayedColumns = ['name', 'type', 'zones', 'assets', 'channels'];
    dataSource = new MatTableDataSource<EnvironmentRow>();
    dataReady = false;
    environmentTypeLabel = environmentTypeLabel;

    userHasReadAuthorization = this.environmentsService.userHasReadAuthorization();
    userHasCreateAuthorization = this.environmentsService.userHasCreateAuthorization();
    userHasDeleteAuthorization = this.environmentsService.userHasDeleteAuthorization();

    @ViewChild('importInput') importInput: any;

    constructor(
        private environmentsService: EnvironmentsService,
        private dialogsService: DialogsService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.displayedColumns.push('open');
        this.displayedColumns.push('export');
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.reload();
    }

    reload(): void {
        this.dataReady = false;
        this.environmentsService.listEnvironments().subscribe(envs => {
            this.dataSource.data = envs.map(environment => ({
                environment,
                counts: countEnvironmentEntities(environment),
            }));
            this.dataReady = true;
        });
    }

    open(env: Environment): void {
        this.router.navigate(['environments', env.id]);
    }

    export(env: Environment): void {
        if (!env.id) {
            return;
        }
        this.environmentsService.getEnvironment(env.id).subscribe(full => {
            if (!full) {
                this.snackBar.open('Error while exporting the environment!', 'close', { panelClass: 'snack-bar-error' });
                return;
            }
            const file = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
            saveAs(file, (env.name || env.id) + '.json');
        });
    }

    delete(env: Environment): void {
        this.dialogsService
            .openDeleteDialog('environment ' + (env.name || env.id))
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                if (confirmed && env.id) {
                    this.environmentsService.deleteEnvironment(env.id).subscribe(ok => {
                        if (ok) {
                            this.snackBar.open('Environment deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the environment!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    newEnvironment(): void {
        this.dialog.open(EnvironmentsCreateDialogComponent).afterClosed().subscribe((env: Environment | undefined) => {
            if (env) {
                this.environmentsService.createEnvironment(env).subscribe(result => {
                    this.afterCreate(result, 'creating');
                });
            }
        });
    }

    triggerImport(): void {
        this.importInput?.nativeElement.click();
    }

    importEnvironment(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            let env: Environment;
            try {
                env = JSON.parse(reader.result as string) as Environment;
            } catch (_e) {
                this.snackBar.open('Could not import environment: invalid JSON', 'close', { panelClass: 'snack-bar-error' });
                input.value = '';
                return;
            }
            this.environmentsService.createEnvironment(env).subscribe(result => {
                this.afterCreate(result, 'importing');
            });
            input.value = '';
        };
        reader.onerror = () => {
            this.snackBar.open('Could not import environment: file could not be read', 'close', { panelClass: 'snack-bar-error' });
            input.value = '';
        };
        reader.readAsText(file);
    }

    /**
     * A create that fails carries a reason, and a generic message hides it: the
     * api answers a rejected document with the offending field, which is the
     * only thing that tells the user what to change.
     */
    private afterCreate(result: Environment | ValidationError | ApiError, verb: string): void {
        if (isValidationError(result)) {
            const first = (result.problems || [])[0];
            const detail = first ? first.path + ': ' + first.message : 'the document was rejected';
            this.snackBar.open('Error while ' + verb + ' the environment - ' + detail, 'close', { panelClass: 'snack-bar-error' });
            return;
        }
        if (isApiError(result)) {
            this.snackBar.open('Error while ' + verb + ' the environment - ' + result.message, 'close', { panelClass: 'snack-bar-error' });
            return;
        }
        if (result.id) {
            this.router.navigate(['environments', result.id]);
            return;
        }
        this.snackBar.open('Error while ' + verb + ' the environment!', 'close', { panelClass: 'snack-bar-error' });
    }
}
