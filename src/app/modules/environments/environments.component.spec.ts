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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import * as fileSaver from 'file-saver';

import { EnvironmentsComponent } from './environments.component';
import { EnvironmentsService } from './shared/environments.service';
import { Environment } from './shared/environments.model';
import { CoreModule } from '../../core/core.module';
import { DialogsService } from '../../core/services/dialogs.service';

// e1 nests a zone within a zone, so a counting implementation without a
// recursion step (only looking at the top-level zones) would under-report it.
const environments: Environment[] = [
    {
        id: 'e1',
        name: 'Plant A',
        type: 'industrial_site',
        zones: [
            {
                id: 'building',
                assets: [{ id: 'a1', channels: [{ id: 'c1' }, { id: 'c2' }] }],
                zones: [
                    { id: 'floor', assets: [{ id: 'a2', channels: [{ id: 'c3' }] }] },
                ],
            },
        ],
    },
    { id: 'e2', name: 'Flat B', type: 'apartment' },
];

class MockEnvironmentsService {
    deletedIds: string[] = [];
    createAuthorized = true;
    deleteAuthorized = true;
    readAuthorized = true;
    created: Environment[] = [];
    createShouldFail = false;

    listEnvironments(): Observable<Environment[]> {
        return of(environments.filter(e => this.deletedIds.indexOf(e.id || '') === -1));
    }

    getEnvironment(id: string): Observable<Environment | null> {
        return of(environments.find(e => e.id === id) || null);
    }

    createEnvironment(env: Environment): Observable<Environment | null> {
        if (this.createShouldFail) {
            return of(null);
        }
        this.created.push(env);
        return of({ ...env, id: 'new-id' });
    }

    deleteEnvironment(id: string): Observable<boolean> {
        this.deletedIds.push(id);
        return of(true);
    }

    userHasReadAuthorization(): boolean {
        return this.readAuthorized;
    }

    userHasCreateAuthorization(): boolean {
        return this.createAuthorized;
    }

    userHasDeleteAuthorization(): boolean {
        return this.deleteAuthorized;
    }
}

class MockDialogsService {
    confirmed = true;

    openDeleteDialog(_text: string): any {
        return { afterClosed: () => of(this.confirmed) };
    }
}

class RouterStub {
    navigate(_commands: unknown[]): Promise<boolean> {
        return Promise.resolve(true);
    }
}

/** Builds a File-like object whose FileReader read resolves to the given text. */
function fakeFileList(content: string, name = 'environment.json'): FileList {
    const file = new File([content], name, { type: 'application/json' });
    return { 0: file, length: 1, item: (_i: number) => file } as unknown as FileList;
}

describe('EnvironmentsComponent', () => {
    let component: EnvironmentsComponent;
    let fixture: ComponentFixture<EnvironmentsComponent>;
    let environmentsService: MockEnvironmentsService;
    let dialogsService: MockDialogsService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsComponent],
            imports: [
                CommonModule,
                CoreModule,
                NoopAnimationsModule,
                MatTableModule,
                MatIconModule,
                MatButtonModule,
                MatTooltipModule,
                MatDialogModule,
                MatSnackBarModule,
            ],
            providers: [
                { provide: EnvironmentsService, useClass: MockEnvironmentsService },
                { provide: DialogsService, useClass: MockDialogsService },
                { provide: Router, useClass: RouterStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsComponent);
        component = fixture.componentInstance;
        environmentsService = TestBed.inject(EnvironmentsService) as unknown as MockEnvironmentsService;
        dialogsService = TestBed.inject(DialogsService) as unknown as MockDialogsService;
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render the list of the user\'s environments', () => {
        fixture.detectChanges();

        expect(component.dataReady).toBe(true);
        expect(component.dataSource.data.length).toBe(2);
    });

    it('should count zones, assets and channels once per row, recursively through nested zones', () => {
        fixture.detectChanges();

        const rows = component.dataSource.data;
        expect(rows.find(r => r.environment.id === 'e1')?.counts).toEqual({ zones: 2, assets: 2, channels: 3 });
        expect(rows.find(r => r.environment.id === 'e2')?.counts).toEqual({ zones: 0, assets: 0, channels: 0 });
    });

    it('should show the delete column only with delete authorization', () => {
        fixture.detectChanges();
        expect(component.displayedColumns).toContain('delete');
    });

    it('should hide the delete column without delete authorization', () => {
        environmentsService.deleteAuthorized = false;
        fixture = TestBed.createComponent(EnvironmentsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.displayedColumns).not.toContain('delete');
    });

    it('should delete an environment after the deletion was confirmed', () => {
        fixture.detectChanges();

        component.delete(environments[0]);

        expect(environmentsService.deletedIds).toEqual(['e1']);
        expect(component.dataSource.data.length).toBe(1);
    });

    it('should keep the environment if the deletion was not confirmed', () => {
        fixture.detectChanges();
        dialogsService.confirmed = false;

        component.delete(environments[0]);

        expect(environmentsService.deletedIds).toEqual([]);
        expect(component.dataSource.data.length).toBe(2);
    });

    it('should export the fetched environment as a JSON blob', () => {
        fixture.detectChanges();
        const saveAsSpy = spyOn(fileSaver, 'saveAs');

        component.export(environments[0]);

        expect(saveAsSpy).toHaveBeenCalledTimes(1);
        const [blob, filename] = saveAsSpy.calls.mostRecent().args as [Blob, string];
        expect(blob.type).toBe('application/json');
        expect(filename).toBe('Plant A.json');
    });

    it('should import a valid JSON file by creating an environment and reloading the list', (done) => {
        fixture.detectChanges();
        const reloadSpy = spyOn(component, 'reload');
        const imported: Environment = { name: 'Imported', type: 'apartment' };
        const input = { files: fakeFileList(JSON.stringify(imported)), value: 'environment.json' } as unknown as HTMLInputElement;

        component.importEnvironment({ target: input } as unknown as Event);

        setTimeout(() => {
            expect(environmentsService.created).toEqual([imported]);
            expect(reloadSpy).toHaveBeenCalled();
            expect(input.value).toBe('');
            done();
        }, 50);
    });

    it('should reject a broken JSON file without creating an environment', (done) => {
        fixture.detectChanges();
        const createSpy = spyOn(environmentsService, 'createEnvironment');
        const snackBarSpy = spyOn((component as any).snackBar, 'open');
        const input = { files: fakeFileList('{not valid json'), value: 'environment.json' } as unknown as HTMLInputElement;

        component.importEnvironment({ target: input } as unknown as Event);

        setTimeout(() => {
            expect(createSpy).not.toHaveBeenCalled();
            expect(snackBarSpy).toHaveBeenCalled();
            expect(input.value).toBe('');
            done();
        }, 50);
    });
});
