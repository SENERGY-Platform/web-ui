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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { OverlayContainer } from '@angular/cdk/overlay';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { ThingsComponent } from './things.component';
import { ThingsService } from './shared/things.service';
import { ThingModel } from './shared/things.model';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('ThingsComponent list', () => {
    let component: ThingsComponent;
    let fixture: ComponentFixture<ThingsComponent>;
    let router: Router;
    let dialogs: { openDeleteDialog: jasmine.Spy };

    const service: Spy<ThingsService> = createSpyFromClass<ThingsService>(ThingsService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const thing = {
        id: 'urn:thing:1',
        name: 'Heater',
        device_links: [
            { id: 'l1', device_id: 'd1', from: '2026-01-01T00:00:00Z', until: null },
            { id: 'l2', device_id: 'd2', from: '2025-01-01T00:00:00Z', until: '2025-06-01T00:00:00Z' },
            { id: 'l3', device_id: 'd3', from: '2026-02-01T00:00:00Z', until: null },
        ],
    } as ThingModel;
    const other: ThingModel = { id: 'urn:thing:2', name: 'Boiler', attributes: [], content_variables: [], owner_id: '', device_links: [] };

    function right(id: string, write: boolean, administrate: boolean): PermissionsV2RightsAndIdModel {
        return { id, write, administrate, read: true, execute: false } as PermissionsV2RightsAndIdModel;
    }

    function init(
        options: {
            update?: boolean;
            delete?: boolean;
            create?: boolean;
            share?: boolean;
            things?: ThingModel[];
            rights?: PermissionsV2RightsAndIdModel[];
        } = {},
    ) {
        const things = options.things ?? [thing];
        service.getThings.and.returnValue(of({ result: things, total: things.length }));
        service.userHasUpdateAuthorization.and.returnValue(options.update ?? true);
        service.userHasDeleteAuthorization.and.returnValue(options.delete ?? true);
        service.userHasCreateAuthorization.and.returnValue(options.create ?? true);
        service.userHasShareAuthorization.and.returnValue(options.share ?? true);
        service.deleteThing.and.returnValue(of(true));
        permissions.getComputedResourcePermissionsV2.and.returnValue(of(options.rights ?? [right(thing.id, true, true)]));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog').and.returnValue({ afterClosed: () => of(true) }) };

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, ThingsComponent],
            providers: [
                { provide: ThingsService, useValue: service },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: dialogs },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(ThingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    /** Closes an open row menu through its backdrop, so the next open renders the menu with current bindings. */
    function closeRowMenu() {
        (document.querySelector('.cdk-overlay-backdrop') as HTMLElement | null)?.click();
        tick(400);
        fixture.detectChanges();
    }

    /** Labels of the row menu items of the first row, as the overlay shows them. */
    function openRowMenu(): string[] {
        closeRowMenu();
        (fixture.nativeElement.querySelector('button[aria-label="Actions"]') as HTMLButtonElement).click();
        tick(400);
        fixture.detectChanges();
        const overlay = TestBed.inject(OverlayContainer).getContainerElement();
        return Array.from(overlay.querySelectorAll('[role="menuitem"]')).map((item) => (item.textContent || '').trim());
    }

    afterEach(() => {
        service.getThings.calls.reset();
        service.deleteThing.calls.reset();
    });

    it('shows Edit with the update right and the write right on the thing, Details otherwise', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        expect(component.canEdit(thing)).toBeTrue();
        expect(openRowMenu().some((label) => label.endsWith('Edit'))).toBeTrue();
        expect(openRowMenu().some((label) => label.endsWith('Details'))).toBeFalse();
    }));

    it('shows Details when the thing is not writable', fakeAsync(() => {
        init({ rights: [right(thing.id, false, true)] });
        discardPeriodicTasks();
        expect(component.canEdit(thing)).toBeFalse();
        const labels = openRowMenu();
        expect(labels.some((label) => label.endsWith('Details'))).toBeTrue();
        expect(labels.some((label) => label.endsWith('Edit'))).toBeFalse();
    }));

    it('shows Details without the update right even with write', fakeAsync(() => {
        init({ update: false, rights: [right(thing.id, true, true)] });
        discardPeriodicTasks();
        expect(component.canEdit(thing)).toBeFalse();
        const labels = openRowMenu();
        expect(labels.some((label) => label.endsWith('Details'))).toBeTrue();
        expect(labels.some((label) => label.endsWith('Edit'))).toBeFalse();
    }));

    it('shows Share only with the share right and the administrate right on the thing', fakeAsync(() => {
        init({ share: true, rights: [right(thing.id, true, false)] });
        discardPeriodicTasks();
        expect(openRowMenu().some((label) => label.endsWith('Share'))).toBeFalse();

        component.permissionsPerInstance = [right(thing.id, true, true)];
        expect(openRowMenu().some((label) => label.endsWith('Share'))).toBeTrue();
    }));

    it('hides Share without the share right even with administrate', fakeAsync(() => {
        init({ share: false });
        discardPeriodicTasks();
        expect(openRowMenu().some((label) => label.endsWith('Share'))).toBeFalse();
    }));

    it('shows Delete only with the delete right and the administrate right on the thing', fakeAsync(() => {
        init({ rights: [right(thing.id, true, false)] });
        discardPeriodicTasks();
        expect(component.canDelete(thing)).toBeFalse();
        expect(openRowMenu().some((label) => label.endsWith('Delete'))).toBeFalse();

        component.permissionsPerInstance = [right(thing.id, true, true)];
        expect(component.canDelete(thing)).toBeTrue();
        expect(openRowMenu().some((label) => label.endsWith('Delete'))).toBeTrue();
    }));

    it('hides Delete without the delete right even with administrate', fakeAsync(() => {
        init({ delete: false });
        discardPeriodicTasks();
        expect(component.canDelete(thing)).toBeFalse();
    }));

    it('has no selection column and no row checkbox without the delete right', fakeAsync(() => {
        init({ delete: false });
        discardPeriodicTasks();
        expect(component.displayedColumns).not.toContain('select');
        expect(fixture.nativeElement.querySelector('mat-checkbox')).toBeNull();
    }));

    it('offers the create button with the create right and opens the editor page', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        const button = fixture.nativeElement.querySelector('senergy-page-header button') as HTMLButtonElement;
        expect(button.textContent).toContain('New thing');
        button.click();
        expect(router.navigate).toHaveBeenCalledWith(['devices/things/edit']);
    }));

    it('does not select rows without the administrate right', fakeAsync(() => {
        init({
            things: [thing, other],
            rights: [right(thing.id, true, true), right(other.id, true, false)],
        });
        discardPeriodicTasks();

        component.masterToggle();
        expect(component.selection.selected).toEqual([thing]);

        const rowCheckboxes = fixture.nativeElement.querySelectorAll('td mat-checkbox input') as NodeListOf<HTMLInputElement>;
        expect(Array.from(rowCheckboxes).map((input) => input.disabled)).toEqual([false, true]);
    }));

    it('deletes each selected thing once in a bulk delete', fakeAsync(() => {
        init({
            things: [thing, other],
            rights: [right(thing.id, true, true), right(other.id, true, true)],
        });
        discardPeriodicTasks();

        component.masterToggle();
        component.deleteMultipleItems();
        tick(400);
        discardPeriodicTasks();

        expect(service.deleteThing).toHaveBeenCalledTimes(2);
        expect(service.deleteThing).toHaveBeenCalledWith(thing.id);
        expect(service.deleteThing).toHaveBeenCalledWith(other.id);
    }));

    it('counts only the open device links in the devices column', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.openDeviceLinkCount(thing)).toBe(2);
        const cell = fixture.nativeElement.querySelector('tr.clickable-row td.num') as HTMLElement;
        expect(cell.textContent?.trim()).toBe('2');
    }));
});
