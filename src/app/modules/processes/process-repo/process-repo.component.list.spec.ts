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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { asapScheduler, BehaviorSubject, of, scheduled } from 'rxjs';
import { ProcessRepoComponent } from './process-repo.component';
import { ProcessRepoService } from './shared/process-repo.service';
import { ProcessModel } from './shared/process.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { PreferencesService } from '../../../core/services/preferences.service';

describe('ProcessRepoComponent list', () => {
    let fixture: ComponentFixture<ProcessRepoComponent>;
    let repoService: jasmine.SpyObj<ProcessRepoService>;
    let navigate: jasmine.Spy;

    const own: ProcessModel = { _id: 'p1', name: 'Washer', date: 1767348000000, svgXML: '<svg/>', bpmn_xml: '', publish: false, owner: 'u1' };
    const shared: ProcessModel = { ...own, _id: 'p2', name: 'Dryer', owner: 'u2' };

    async function init(rights: { update: boolean; delete: boolean; execute: boolean; administrate: boolean }, warnings = new Map<string, string>()) {
        repoService = jasmine.createSpyObj<ProcessRepoService>('ProcessRepoService', [
            'getProcessModels',
            'userHasCreateAuthorization',
            'userHasUpdateAuthorization',
            'userHasDeleteAuthorization',
        ]);
        // asynchronous like the HTTP call it stands for
        repoService.getProcessModels.and.callFake(() => scheduled([{ result: [own, shared], total: 2 }], asapScheduler));
        repoService.userHasCreateAuthorization.and.returnValue(true);
        repoService.userHasUpdateAuthorization.and.returnValue(rights.update);
        repoService.userHasDeleteAuthorization.and.returnValue(rights.delete);
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProcessRepoComponent],
            providers: [
                { provide: ProcessRepoService, useValue: repoService },
                { provide: AuthorizationService, useValue: { getUserId: () => 'u1' } },
                {
                    provide: PermissionsService,
                    useValue: {
                        getComputedResourcePermissionsV2: (_: string, ids: string[]) =>
                            of(ids.map((id) => ({ id, read: true, write: true, execute: rights.execute, administrate: rights.administrate }))),
                        getUserById: () => of({ id: 'u2', username: 'Alice' }),
                    },
                },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(warnings) } },
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                provideRouter([]),
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        }).compileComponents();
        navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(ProcessRepoComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const all = { update: true, delete: true, execute: true, administrate: true };
    const menuLabels = async (row: number): Promise<string[]> => {
        const buttons = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row button[aria-label="Actions"], tr[mat-row] button[aria-label="Actions"]');
        (buttons[row] as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/^\w+ /, ''));
    };

    it('reloads exactly once when the refresh button is clicked', async () => {
        await init(all);
        repoService.getProcessModels.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        await fixture.whenStable();

        expect(repoService.getProcessModels).toHaveBeenCalledTimes(1);
    });

    it('opens the designer on a row click with the update right', async () => {
        await init(all);

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(navigate).toHaveBeenCalledWith('/processes/designer/p1');
    });

    it('leaves the rows unclickable without the update right', async () => {
        await init({ ...all, update: false });

        const row = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement;
        row.click();

        expect(row.classList).not.toContain('clickable-row');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('shows the name with a shared chip for another owner, the date and the preview as an image', async () => {
        await init(all);

        const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLElement>;
        expect(rows[0].querySelector('.name-cell')?.textContent).toContain('Washer');
        expect(rows[0].querySelector('.name-chip')).toBeNull();
        expect(rows[1].querySelector('.name-chip')?.textContent).toContain('Shared by Alice');
        expect(rows[0].querySelector('.muted')?.textContent).toContain('02.01.2026');
        expect(rows[0].querySelector('img.svg-preview')?.getAttribute('src')).toContain('data:image/svg+xml;base64,');
    });

    it('shows the metadata warning as a status chip with the warning as tooltip text', async () => {
        await init(all, new Map([['p1', 'Missing: urn:x']]));

        const chip = fixture.nativeElement.querySelector('tr[mat-row] .status-chip.warning') as HTMLElement;
        expect(chip.textContent).toContain('Metadata missing');
    });

    it('offers the menu actions in the fixed order with delete last', async () => {
        await init(all);

        expect(await menuLabels(0)).toEqual(['Edit', 'Deploy', 'Copy', 'Download BPMN', 'Download SVG', 'Share', 'Delete']);
    });

    it('hides deploy, share and delete without the matching right instead of disabling them', async () => {
        await init({ update: false, delete: false, execute: false, administrate: false });

        expect(await menuLabels(0)).toEqual(['Copy', 'Download BPMN', 'Download SVG']);
    });

    it('has a selection column only with the delete right', async () => {
        await init({ ...all, delete: false });

        expect(fixture.componentInstance.displayedColumns).not.toContain('select');
    });
});
