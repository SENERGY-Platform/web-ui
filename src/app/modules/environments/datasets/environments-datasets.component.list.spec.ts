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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';

import { EnvironmentsDatasetsComponent } from './environments-datasets.component';
import { EnvironmentsService } from '../shared/environments.service';
import { DatasetMeta } from '../shared/environments.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

describe('EnvironmentsDatasetsComponent list', () => {
    let fixture: ComponentFixture<EnvironmentsDatasetsComponent>;
    let component: EnvironmentsDatasetsComponent;
    let service: jasmine.SpyObj<EnvironmentsService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let search: BehaviorSubject<string>;

    const datasets: DatasetMeta[] = [
        { id: 'd1', name: 'profile.csv', timezone: 'Europe/Berlin', size_bytes: 2048, created_unix: 1700000000, columns: [{ name: 'value', points: 100 }] },
        { id: 'd2', name: 'load.csv', timezone: 'UTC', size_bytes: 10, created_unix: 1700000100, columns: [] },
    ];

    function init(rights = { read: true, create: true, delete: true }) {
        search = new BehaviorSubject('');
        service = jasmine.createSpyObj<EnvironmentsService>('EnvironmentsService', [
            'listDatasets', 'deleteDataset', 'userHasDatasetReadAuthorization', 'userHasDatasetCreateAuthorization', 'userHasDatasetDeleteAuthorization',
        ]);
        service.listDatasets.and.returnValue(of(datasets));
        service.deleteDataset.and.returnValue(of(true));
        service.userHasDatasetReadAuthorization.and.returnValue(rights.read);
        service.userHasDatasetCreateAuthorization.and.returnValue(rights.create);
        service.userHasDatasetDeleteAuthorization.and.returnValue(rights.delete);
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog').and.returnValue({ afterClosed: () => of(true) }) };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, EnvironmentsDatasetsComponent],
            providers: [
                { provide: EnvironmentsService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: SearchbarService, useValue: { currentSearchText: search, changeMessage: (t: string) => search.next(t) } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsDatasetsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.listDatasets.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(service.listDatasets).toHaveBeenCalledTimes(1);
    }));

    it('offers the upload as a filled header action only with the create right', fakeAsync(() => {
        init();
        expect(fixture.nativeElement.querySelector('senergy-page-header button').textContent).toContain('Upload dataset');

        fixture.destroy();
        TestBed.resetTestingModule();
        init({ read: true, create: false, delete: true });
        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('confirms the delete through the shared delete dialog with the channel hint as its note', fakeAsync(() => {
        init();

        component.delete(datasets[0]);

        expect(dialogs.openDeleteDialog).toHaveBeenCalledWith('dataset profile.csv', jasmine.objectContaining({ note: jasmine.stringMatching(/Channels/) }));
        expect(service.deleteDataset).toHaveBeenCalledWith('d1');
    }));

    it('narrows the list with the toolbar search by name', fakeAsync(() => {
        init();

        search.next('load');

        expect(component.dataSource.filteredData.map((d) => d.id)).toEqual(['d2']);
    }));

    it('says so when the user may not read datasets', fakeAsync(() => {
        init({ read: false, create: false, delete: false });
        component.dataSource.data = [];
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('senergy-empty-state')).not.toBeNull();
    }));
});
