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


import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { KongService } from '../shared/services/kong.service';
import { LadonService } from '../shared/services/ladom.service';
import { PermissionModel } from '../shared/permission.model';
import { PermissionsListComponent } from './permissions-list.component';

describe('PermissionsListComponent write failures', () => {
    let component: PermissionsListComponent;
    let ladon: jasmine.SpyObj<LadonService>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    let loadSpy: jasmine.Spy;

    const policy = { id: 'p1', subject: 's', resource: '/r', actions: ['GET'] } as PermissionModel;
    const snackText = () => snackBar.open.calls.mostRecent().args[0];

    beforeEach(() => {
        ladon = jasmine.createSpyObj<LadonService>('LadonService', ['deletePolicies', 'postPolicies', 'putPolicies', 'getAllPolicies']);
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        const dialogs = jasmine.createSpyObj<DialogsService>('DialogsService', ['openDeleteDialog']);
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(true) } as any);
        const auth = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['loadAllRoles', 'loadAllUsers', 'loadAllClients']);
        auth.loadAllRoles.and.returnValue(of([]));
        auth.loadAllUsers.and.returnValue(of([]));
        auth.loadAllClients.and.returnValue(of([]));

        TestBed.configureTestingModule({
            imports: [PermissionsListComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: LadonService, useValue: ladon },
                { provide: AuthorizationService, useValue: auth },
                { provide: DialogsService, useValue: dialogs },
                { provide: KongService, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MatDialog, useValue: {} },
                { provide: DomSanitizer, useValue: {} },
                { provide: MatSnackBar, useValue: snackBar },
            ],
        });
        component = TestBed.createComponent(PermissionsListComponent).componentInstance;
        loadSpy = spyOn(component, 'loadPolicies');
        component.policies = [policy];
    });

    it('does not reload and names the action when deleting a policy fails', () => {
        ladon.deletePolicies.and.returnValue(of(false));

        component.deletePolicy(policy);

        expect(loadSpy).not.toHaveBeenCalled();
        expect(snackText()).toContain('Could not delete the policy');
    });

    it('reloads after a successful delete', () => {
        ladon.deletePolicies.and.returnValue(of(true));

        component.deletePolicy(policy);

        expect(loadSpy).toHaveBeenCalled();
        expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('does not reload and names the action when deleting the selection fails', () => {
        ladon.deletePolicies.and.returnValue(of(false));
        component.selection.select(policy);

        component.deleteMultipleItems();

        expect(loadSpy).not.toHaveBeenCalled();
        expect(snackText()).toContain('Could not delete the selected policies');
    });

    describe('import', () => {
        const imported = { policies: [policy], overwrite: true };

        const runImport = (result: unknown) => {
            (component as any).dialog = { open: () => ({ afterClosed: () => of(result) }) };
            component.import();
        };

        it('resets the spinner and names the action when the merge import fails', () => {
            ladon.putPolicies.and.returnValue(of(false));

            runImport({ policies: [policy], overwrite: false });

            expect(component.importing).toBeFalse();
            expect(component.ready).toBeTrue();
            expect(loadSpy).not.toHaveBeenCalled();
            expect(snackText()).toContain('Could not import the policies');
        });

        it('resets the spinner and posts nothing when the overwrite cannot delete the old policies', () => {
            ladon.deletePolicies.and.returnValue(of(false));

            runImport(imported);

            expect(ladon.postPolicies).not.toHaveBeenCalled();
            expect(component.importing).toBeFalse();
            expect(component.ready).toBeTrue();
            expect(snackText()).toContain('Could not import the policies');
        });

        it('reloads the list when the overwrite deleted the old policies but could not post the new ones', () => {
            ladon.deletePolicies.and.returnValue(of(true));
            ladon.postPolicies.and.returnValue(of(false));

            runImport(imported);

            expect(component.importing).toBeFalse();
            expect(loadSpy).toHaveBeenCalled();
            expect(snackText()).toContain('Could not import the policies');
        });

        it('reloads without an error after a successful overwrite import', () => {
            ladon.deletePolicies.and.returnValue(of(true));
            ladon.postPolicies.and.returnValue(of(true));

            runImport(imported);

            expect(component.importing).toBeFalse();
            expect(loadSpy).toHaveBeenCalled();
            expect(snackBar.open).not.toHaveBeenCalled();
        });
    });
});
