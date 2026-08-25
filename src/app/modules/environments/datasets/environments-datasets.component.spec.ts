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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { EnvironmentsDatasetsComponent } from './environments-datasets.component';
import { EnvironmentsService } from '../shared/environments.service';
import { ApiError, DatasetMeta } from '../shared/environments.model';
import { CoreModule } from '../../../core/core.module';
import { DialogsService } from '../../../core/services/dialogs.service';

const datasets: DatasetMeta[] = [
    {
        id: 'd1',
        name: 'profile.csv',
        timezone: 'Europe/Berlin',
        size_bytes: 2048,
        created_unix: 1700000000,
        columns: [{ name: 'value', points: 100, from_unix: 1690000000, to_unix: 1690003600 }],
    },
];

class MockEnvironmentsService {
    readAuthorized = true;
    createAuthorized = true;
    deleteAuthorized = true;
    deletedIds: string[] = [];
    uploaded: { name: string; content: string; tz?: string }[] = [];
    uploadResult: DatasetMeta | ApiError = { id: 'new-id', name: 'new.csv' };

    listDatasets(): Observable<DatasetMeta[]> {
        return of(datasets.filter((d) => this.deletedIds.indexOf(d.id || '') === -1));
    }

    deleteDataset(id: string): Observable<boolean> {
        this.deletedIds.push(id);
        return of(true);
    }

    uploadDatasetChecked(name: string, content: string, tz?: string): Observable<DatasetMeta | ApiError> {
        this.uploaded.push({ name, content, tz });
        return of(this.uploadResult);
    }

    userHasDatasetReadAuthorization(): boolean {
        return this.readAuthorized;
    }

    userHasDatasetCreateAuthorization(): boolean {
        return this.createAuthorized;
    }

    userHasDatasetDeleteAuthorization(): boolean {
        return this.deleteAuthorized;
    }
}

class MockDialogsService {
    confirmed = true;

    openConfirmDialog(_title: string, _text: string): any {
        return { afterClosed: () => of(this.confirmed) };
    }
}

describe('EnvironmentsDatasetsComponent', () => {
    let component: EnvironmentsDatasetsComponent;
    let fixture: ComponentFixture<EnvironmentsDatasetsComponent>;
    let environmentsService: MockEnvironmentsService;
    let dialogsService: MockDialogsService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsDatasetsComponent],
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
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsDatasetsComponent);
        component = fixture.componentInstance;
        environmentsService = TestBed.inject(EnvironmentsService) as unknown as MockEnvironmentsService;
        dialogsService = TestBed.inject(DialogsService) as unknown as MockDialogsService;
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render the list of datasets', () => {
        fixture.detectChanges();

        expect(component.dataReady).toBe(true);
        expect(component.dataSource.data.length).toBe(1);
        expect(component.dataSource.data[0].name).toBe('profile.csv');
    });

    it('should show the delete column only with delete authorization', () => {
        fixture.detectChanges();
        expect(component.displayedColumns).toContain('delete');
    });

    it('should hide the delete column without delete authorization', () => {
        environmentsService.deleteAuthorized = false;
        fixture = TestBed.createComponent(EnvironmentsDatasetsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.displayedColumns).not.toContain('delete');
    });

    it('should delete a dataset after the deletion was confirmed and reload the list', () => {
        fixture.detectChanges();

        component.delete(datasets[0]);

        expect(environmentsService.deletedIds).toEqual(['d1']);
        expect(component.dataSource.data.length).toBe(0);
    });

    it('should keep the dataset if the deletion was not confirmed', () => {
        fixture.detectChanges();
        dialogsService.confirmed = false;

        component.delete(datasets[0]);

        expect(environmentsService.deletedIds).toEqual([]);
    });

    it('should open the upload dialog and reload the list once it closes with a created dataset', () => {
        fixture.detectChanges();
        const dialog = TestBed.inject(MatDialog);
        const reloadSpy = spyOn(component, 'reload').and.callThrough();
        spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of({ id: 'new-id', name: 'new.csv' } as DatasetMeta) } as any);

        component.upload();

        expect(reloadSpy).toHaveBeenCalled();
    });

    it('should not reload when the upload dialog is dismissed without creating a dataset', () => {
        fixture.detectChanges();
        const dialog = TestBed.inject(MatDialog);
        const reloadSpy = spyOn(component, 'reload');
        spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);

        component.upload();

        expect(reloadSpy).not.toHaveBeenCalled();
    });
});
