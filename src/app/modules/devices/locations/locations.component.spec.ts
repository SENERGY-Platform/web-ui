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


import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { LocationsComponent } from './locations.component';
import { LocationsService } from './shared/locations.service';
import { ExtendedLocationModel } from './shared/locations.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';

describe('LocationsComponent delete', () => {
    const one = { id: 'urn:infai:ses:location:1', name: 'One' } as ExtendedLocationModel;
    const two = { id: 'urn:infai:ses:location:2', name: 'Two' } as ExtendedLocationModel;

    let component: LocationsComponent;
    let service: jasmine.SpyObj<LocationsService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<LocationsService>('LocationsService', ['getLocations', 'deleteLocation']);
        service.getLocations.and.returnValue(of({ result: [one, two], total: 2 }));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: LocationsService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: Router, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(LocationsComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(LocationsComponent).componentInstance;
    });

    describe('single delete', () => {
        it('asks with the location name', () => {
            answerDialog(false);
            component.deleteLocation(one);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('location One');
        });

        it('deletes by id, reports success and reloads only after 2.5 seconds', fakeAsync(() => {
            answerDialog(true);
            service.deleteLocation.and.returnValue(of(true));
            component.deleteLocation(one);
            expect(service.deleteLocation).toHaveBeenCalledOnceWith(one.id);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Location deleted successfully.', undefined, { duration: 2000 });
            expect(component.ready).toBeFalse();

            tick(2499);
            expect(service.getLocations).not.toHaveBeenCalled();
            tick(1);
            expect(service.getLocations).toHaveBeenCalledTimes(1);
            expect(component.ready).toBeTrue();
        }));

        it('reports a failed delete as error and does not reload', fakeAsync(() => {
            answerDialog(true);
            service.deleteLocation.and.returnValue(of(false));
            component.deleteLocation(one);
            tick(5000);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting the location!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getLocations).not.toHaveBeenCalled();
            expect(component.ready).toBeFalse();
        }));

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, fakeAsync(() => {
                answerDialog(answer);
                component.deleteLocation(one);
                tick(5000);
                expect(service.deleteLocation).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getLocations).not.toHaveBeenCalled();
            }));
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 location');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 locations');
        });

        it('deletes every selected id once, reports success, reloads at once and clears the selection', () => {
            answerDialog(true);
            service.deleteLocation.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteLocation.calls.allArgs()).toEqual([[one.id], [two.id]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Locations deleted successfully.', undefined, { duration: 2000 });
            expect(service.getLocations).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports one failed delete as a single error, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteLocation.and.returnValues(of(true), of(false));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteLocation).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting locations!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getLocations).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteLocation).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getLocations).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
