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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClipboardService } from 'ngx-clipboard';
import { of } from 'rxjs';
import { ExportDetailsComponent } from './export-details.component';
import { ExportService } from '../shared/export.service';
import { BrokerExportService } from '../shared/broker-export.service';
import { ExportModel } from '../shared/export.model';
import { ExportDataService } from '../../../widgets/shared/export-data.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { environment } from '../../../../environments/environment';

const DB_ID = 'export-1';
const BROKER_ID = BrokerExportService.ID_PREFIX + 'one';

const dbExport = (filterType = 'deviceId', entity = 'a device') =>
    ({
        ID: DB_ID,
        Name: 'Temperature',
        Description: 'Hourly values',
        FilterType: filterType,
        EntityName: entity,
        TimePath: 'value.metrics.time',
        ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
        ExportDatabase: {Name: 'Timescale'},
        Measurement: 'measurement-1',
        CreatedAt: '2026-03-04T10:15:00',
        Values: [{Name: 'level', Path: 'value.metrics.level', Type: 'float'}],
    }) as unknown as ExportModel;

const brokerExport = (own: boolean) =>
    ({
        ID: BROKER_ID,
        Name: 'To the broker',
        FilterType: 'deviceId',
        EntityName: 'a device',
        CreatedAt: '2026-03-04T10:15:00',
        ...(own ? {CustomMqttBroker: 'tcp://broker:1883', CustomMqttBaseTopic: 'base/', CustomMqttUser: 'a user', CustomMqttPassword: 'a password'} : {}),
        Values: [{Name: 'level', Path: 'value.metrics.level', Type: 'float'}],
    }) as unknown as ExportModel;

/** The visible text of a node, one entry per text node. */
const texts = (root: HTMLElement): string[] => {
    const found: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text !== '') {
            found.push(text);
        }
    }
    return found;
};

describe('ExportDetailsComponent', () => {
    let fixture: ComponentFixture<ExportDetailsComponent>;
    let lastValuesTimescale: jasmine.Spy;
    let copy: jasmine.Spy;
    let snackOpen: jasmine.Spy;
    let previousSub: string | null;

    let permissions: jasmine.Spy;

    const open = (id: string, exp: ExportModel, rights = {update: true, write: true}) => {
        permissions = jasmine.createSpy('getComputedResourcePermissionsV2').and.callFake(() => of([{id, write: rights.write, administrate: true, read: true, execute: false}]));
        lastValuesTimescale = jasmine.createSpy('getLastValuesTimescale').and.callFake(() => of([{time: '2026-03-04T10:15:30', value: 21.5}]));
        copy = jasmine.createSpy('copyFromContent');
        snackOpen = jasmine.createSpy('open');
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{path: 'exports/edit/:id', children: []}]),
                {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => id}}}},
                {provide: MatSnackBar, useValue: {open: snackOpen}},
                {provide: ClipboardService, useValue: {copyFromContent: copy}},
                {provide: ExportService, useValue: {getExport: () => of(exp), userHasUpdateAuthorization: () => rights.update}},
                {provide: BrokerExportService, useValue: {getExport: () => of(exp)}},
                {provide: ExportDataService, useValue: {getLastValuesTimescale: lastValuesTimescale, getLastValuesInflux: () => of([])}},
                {provide: AuthorizationService, useValue: {getUserName: () => 'a-user'}},
                {provide: PermissionsService, useValue: {getComputedResourcePermissionsV2: permissions}},
            ],
        });
        fixture = TestBed.createComponent(ExportDetailsComponent);
        fixture.detectChanges();
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    const rows = (page: HTMLElement) => Array.from(page.querySelectorAll('tr[mat-row]')).map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => (cell.textContent ?? '').trim()));
    const headers = (page: HTMLElement) => Array.from(page.querySelectorAll('th')).map((cell) => (cell.textContent ?? '').trim());

    beforeEach(() => {
        previousSub = localStorage.getItem('sub');
        localStorage.setItem('sub', 'user-1');
    });

    afterEach(() => {
        if (previousSub === null) {
            localStorage.removeItem('sub');
        } else {
            localStorage.setItem('sub', previousSub);
        }
    });

    it('shows the name, the source, the database and the time path of a database export', () => {
        const page = open(DB_ID, dbExport());
        const shown = texts(page);

        expect(shown).toContain('Temperature');
        expect(shown).toContain('Hourly values');
        expect(shown).toContain('a device');
        expect(shown).toContain('Timescale');
        expect(shown).toContain('value.metrics.time');
        expect(shown.some((text) => text.includes('04.03.2026 - 10:15'))).toBeTrue();
        expect(shown).not.toContain('Topic');
        expect(shown).not.toContain('Credentials');
    });

    it('shows the entity of a pipeline export and of an import export', () => {
        expect(texts(open(DB_ID, dbExport('operatorId', 'operator-a')))).toContain('operator-a');
        TestBed.resetTestingModule();
        expect(texts(open(DB_ID, dbExport('import_id', 'an import')))).toContain('an import');
    });

    it('shows the last values of a database export in a table and loads them again on refresh', () => {
        const page = open(DB_ID, dbExport());

        expect(headers(page)).toEqual(['Name', 'Path', 'Type', 'LastValue', 'LastTimeStamp']);
        expect(rows(page)).toEqual([['level', 'value.metrics.level', 'float', '21.5', '04.03.2026 - 10:15:30']]);
        expect(lastValuesTimescale).toHaveBeenCalledTimes(1);
        expect(lastValuesTimescale.calls.mostRecent().args[0]).toEqual([{exportId: DB_ID, measurement: 'measurement-1', columnName: 'level', math: undefined}]);

        (page.querySelector('.refreshValueButton') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(lastValuesTimescale).toHaveBeenCalledTimes(2);
    });

    it('shows the topic, the own broker and the credentials of a broker export, and the password only while hovered', () => {
        const page = open(BROKER_ID, brokerExport(true));
        const shown = texts(page);

        expect(shown).toContain('base/#');
        expect(shown).toContain('tcp://broker:1883');
        expect(shown).toContain('Username: a user');
        expect(shown).toContain('Password: ●●●●●');
        expect(shown).not.toContain('Password: a password');
        expect(shown.join('|')).not.toContain('a password');
        expect(shown).not.toContain('Timescale');
        expect(page.querySelector('.refreshValueButton')).toBeNull();

        const password = page.querySelector('.pw') as HTMLElement;
        password.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();
        expect(texts(page)).toContain('Password: a password');
        password.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
        expect(texts(page).join('|')).not.toContain('a password');
    });

    it('shows the platform broker, the user name and no password of a broker export without an own broker', () => {
        const page = open(BROKER_ID, brokerExport(false));
        const shown = texts(page);

        expect(shown).toContain('export/user-1/' + BROKER_ID + '/#');
        expect(shown).toContain(environment.brokerExportBroker);
        expect(shown).toContain('Username: a-user');
        expect(shown).toContain('Password: ●●●●●');

        (page.querySelector('.pw') as HTMLElement).dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();
        expect(texts(page)).toContain('Password: Your SENERGY password');
    });

    it('lists the values of a broker export by subtopic and copies the topic', () => {
        const page = open(BROKER_ID, brokerExport(true));

        expect(headers(page)).toEqual(['Subtopic', 'Path', 'Copy']);
        expect(rows(page).map((row) => row.slice(0, 2))).toEqual([['level', 'value.metrics.level']]);

        (page.querySelector('tr[mat-row] button') as HTMLButtonElement).click();

        expect(copy).toHaveBeenCalledOnceWith('base/level');
        expect(snackOpen).toHaveBeenCalledWith('Topic copied to clipboard', undefined, {duration: 2000});
    });

    describe('header', () => {
        const edit = (page: HTMLElement) => page.querySelector('senergy-page-header button[matButton]') as HTMLElement | null;

        it('titles the page by the export and links back to the list of its kind', () => {
            const page = open(DB_ID, dbExport());
            expect((page.querySelector('.page-title') as HTMLElement).textContent).toBe('Temperature');
            expect((page.querySelector('.page-description') as HTMLElement).textContent).toBe('Hourly values');
            expect((page.querySelector('a.page-back') as HTMLElement).getAttribute('href')).toBe('/exports/db');

            TestBed.resetTestingModule();
            const broker = open(BROKER_ID, brokerExport(true));
            expect((broker.querySelector('a.page-back') as HTMLElement).getAttribute('href')).toBe('/exports/broker');
        });

        it('offers Edit with the update right and the write right on the export, as the list does', async () => {
            const page = open(DB_ID, dbExport());

            expect(edit(page)?.textContent).toContain('Edit');
            expect(permissions).toHaveBeenCalledOnceWith('export-instances', [DB_ID]);

            edit(page)?.click();
            await fixture.whenStable();
            expect(TestBed.inject(Router).url).toBe('/exports/edit/' + DB_ID);
        });

        it('offers no Edit without the write right on the export', () => {
            expect(edit(open(DB_ID, dbExport(), {update: true, write: false}))).toBeNull();
        });

        it('offers no Edit without the update right and does not ask for the permissions then', () => {
            expect(edit(open(DB_ID, dbExport(), {update: false, write: true}))).toBeNull();
            expect(permissions).not.toHaveBeenCalled();
        });
    });
});
