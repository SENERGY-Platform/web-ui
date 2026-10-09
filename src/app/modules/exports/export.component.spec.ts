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

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { bulkDeleteOutcome, ExportComponent } from './export.component';
import { ExportModel } from './shared/export.model';
import { ExportService } from './shared/export.service';
import { BrokerExportService } from './shared/broker-export.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { PermissionsDialogService } from '../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../permissions/shared/permissions.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { DialogsService } from '../../core/services/dialogs.service';
import { SearchbarService } from '../../core/components/searchbar/shared/searchbar.service';

describe('bulkDeleteOutcome', () => {
    it('should report a full delete as done', () => {
        expect(bulkDeleteOutcome(204, 3)).toEqual({ message: '3 exports deleted', failed: false, pending: false });
        expect(bulkDeleteOutcome(200, 1)).toEqual({ message: '1 export deleted', failed: false, pending: false });
    });

    it('should report a 207 as a partial failure', () => {
        expect(bulkDeleteOutcome(207, 3)).toEqual({ message: 'Not all exports could be deleted', failed: true, pending: false });
    });

    // The server keeps deleting after the gateway gave up, so a timeout is not a failure.
    it('should report a gateway timeout as still running, not as an error', () => {
        for (const status of [504, 0]) {
            const outcome = bulkDeleteOutcome(status, 3);
            expect(outcome.failed).toBe(false);
            expect(outcome.pending).toBe(true);
            expect(outcome.message).toContain('continues in the background');
        }
    });

    it('should report any other status as a failure', () => {
        expect(bulkDeleteOutcome(500, 2)).toEqual({ message: 'The exports could not be deleted', failed: true, pending: false });
    });
});

describe('ExportComponent header checkbox', () => {
    let component: ExportComponent;
    const row = (id: string) => ({ ID: id } as ExportModel);
    const setRows = (ids: string[]) => (component.exportsDataSource.data = ids.map(row));
    const administrate = (...ids: string[]) =>
        (component.permissionsPerExports = ids.map((id) => ({ id, administrate: true, read: true, write: true, execute: true })));
    const selectedIds = () => component.selection.selected.map((e) => e.ID).sort();

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatSnackBarModule, MatDialogModule],
            providers: [
                provideRouter([]),
                { provide: ExportService, useValue: {} },
                { provide: BrokerExportService, useValue: {} },
                { provide: ExportDataService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PermissionsService, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: SearchbarService, useValue: {} },
            ],
        }).overrideComponent(ExportComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(ExportComponent).componentInstance;
    });

    it('counts no rows as all selected; toggle selects nothing and then clears', () => {
        setRows([]);
        expect(component.isAllSelected()).toBeTrue();
        component.masterToggle();
        expect(component.selection.selected).toEqual([]);
    });

    it('counts a list without administrable rows as all selected and selects nothing', () => {
        setRows(['a', 'b']);
        expect(component.isAllSelected()).toBeTrue();
        component.masterToggle();
        expect(component.selection.selected).toEqual([]);
    });

    it('selects only administrable rows and counts them as all', () => {
        setRows(['a', 'b', 'c']);
        administrate('a', 'c');
        expect(component.isAllSelected()).toBeFalse();
        component.masterToggle();
        expect(selectedIds()).toEqual(['a', 'c']);
        expect(component.isAllSelected()).toBeTrue();
    });

    it('does not count a partial selection as all and clears a full one on toggle', () => {
        setRows(['a', 'b', 'c']);
        administrate('a', 'c');
        component.selection.select(component.exportsDataSource.data[0]);
        expect(component.isAllSelected()).toBeFalse();
        component.masterToggle();
        expect(selectedIds()).toEqual(['a', 'c']);
        component.masterToggle();
        expect(component.selection.selected).toEqual([]);
    });

    it('counts a non-administrable row in the selection towards the number of selected rows', () => {
        setRows(['a', 'b', 'c']);
        administrate('a', 'c');
        component.selection.select(component.exportsDataSource.data[0], component.exportsDataSource.data[1]);
        expect(component.isAllSelected()).toBeTrue();
    });
});
