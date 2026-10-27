/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { SmartServiceReleasesComponent } from './releases.component';
import { SmartServiceReleasesService } from './shared/release.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { UtilService } from '../../../core/services/util.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceInstanceDialogService } from '../instances/shared/instance-dialog.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { ContentReviewService } from '../requests/shared/content-review.service';
import { UrlStateService } from 'src/app/core/services/url-state.service';
import { UrlStateServiceMock } from 'src/app/core/services/url-state.service.mock';

describe('SmartServiceReleasesComponent', () => {
    let fixture: ComponentFixture<SmartServiceReleasesComponent>;
    let component: SmartServiceReleasesComponent;
    let getList: jasmine.Spy;

    const release = (id: string, extra: object = {}, permissions = { a: true, x: true, r: true, w: true }) => ({
        id, name: id, description: 'about ' + id, design_id: 'd', created_at: 1760000000, svg_xml: '', bpmn_xml: '',
        permissions_info: { shared: false, permissions },
        ...extra,
    });

    async function init(releases: object[], deleteRight = true, total = releases.length) {
        getList = jasmine.createSpy('getExtendedReleaseList').and.callFake(() => of({ releases, total }));
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, SmartServiceReleasesComponent],
            providers: [
                { provide: SmartServiceReleasesService, useValue: { userHasDeleteAuthorization: () => deleteRight, getExtendedReleaseList: getList } },
                { provide: SearchbarService, useValue: { currentSearchText: of(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map()) } },
                { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => null }) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: Router, useValue: {} },
                { provide: UrlStateService, useClass: UrlStateServiceMock },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
                { provide: ContentReviewService, useValue: { canProposeRelease: () => false } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(SmartServiceReleasesComponent);
        component = fixture.componentInstance;
        // the stubbed answer is synchronous, so ready flips inside the first check; the app gets it asynchronously
        fixture.detectChanges(false);
        fixture.detectChanges();
    }

    const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));

    async function menuLabels(row: number): Promise<string[]> {
        (fixture.nativeElement.querySelectorAll('tr[mat-row] button[aria-label="Actions"]')[row] as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/^\w+ /, ''));
    }

    it('renders releases with and without changed resources and a chip only at the changed one', async () => {
        await init([release('plain'), release('changed', { changed_resources: [{ kind: 'flow', id: 'flow-1', reason: 'gone', at: 1760000000 }] })]);

        expect(rows().length).toBe(2);
        const chips = fixture.debugElement.queryAll(By.css('senergy-changed-resources-hint .status-chip.warning'));
        expect(chips.length).toBe(1);
        expect(chips[0].injector.get(MatTooltip).message).toContain('Flow flow-1: gone on');
    });

    it('shows name, description, the release date and whether a newer release exists', async () => {
        await init([release('current'), release('old', { new_release_id: 'current' }, undefined), release('shared', { permissions_info: { shared: true, permissions: { a: true, x: true } } })]);

        const [current, old, shared] = rows();
        expect(current.querySelector('.name-cell')?.textContent).toContain('current');
        expect(current.textContent).toContain('about current');
        expect(current.querySelector('td.muted')?.textContent).toContain('2025');
        expect(current.querySelector('.status-chip.online')?.textContent).toContain('Latest');
        expect(old.textContent).toContain('Superseded');
        expect(shared.querySelector('.name-chip')?.textContent).toContain('Shared');
    });

    it('shows an error as a failed status chip with the error as tooltip', async () => {
        await init([release('broken', { error: 'module failed' })]);

        const chip = fixture.debugElement.query(By.css('.status-chip.failed'));
        expect(chip.injector.get(MatTooltip).message).toBe('module failed');
    });

    it('loads one page from the server and hands the total to the paginator', async () => {
        await init([release('a')], true, 45);

        expect(getList).toHaveBeenCalledWith(20, 0, '', 'r', true, undefined, 'name.asc');
        expect(component.totalCount).toBe(45);
    });

    it('reloads exactly once when the refresh button is clicked', async () => {
        await init([release('a')]);
        getList.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();

        expect(getList).toHaveBeenCalledTimes(1);
    });

    it('sends the sort column to the server', async () => {
        await init([release('a')]);
        getList.calls.reset();

        component.matSortChange({ active: 'created_at', direction: 'desc' });

        expect(getList.calls.mostRecent().args[6]).toBe('created_at.desc');
    });

    it('asks for older releases too when the filter is on', async () => {
        await init([release('a')]);
        getList.calls.reset();

        component.showOlder(true);

        expect(getList).toHaveBeenCalledTimes(1);
        expect(getList.calls.mostRecent().args[4]).toBeFalse();
    });

    it('offers the menu actions in the fixed order with delete last', async () => {
        await init([release('a')]);

        expect(await menuLabels(0)).toEqual(['Launch instance', 'Show instances', 'Export to designer', 'Download BPMN', 'Download SVG', 'Share', 'Delete']);
    });

    it('hides launch, share and delete instead of disabling them without the matching right', async () => {
        await init([release('a', {}, { a: false, x: false, r: true, w: false })]);

        expect(await menuLabels(0)).toEqual(['Show instances', 'Export to designer', 'Download BPMN', 'Download SVG']);
    });

    it('hides delete without the delete right of the service', async () => {
        await init([release('a')], false);

        expect(await menuLabels(0)).not.toContain('Delete');
    });
});
