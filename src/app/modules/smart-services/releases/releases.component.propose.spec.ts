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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
import { ProposeDialogComponent } from '../requests/propose-dialog/propose-dialog.component';
import { UrlStateService } from 'src/app/core/services/url-state.service';
import { UrlStateServiceMock } from 'src/app/core/services/url-state.service.mock';

describe('SmartServiceReleasesComponent propose action', () => {
    let fixture: ComponentFixture<SmartServiceReleasesComponent>;
    let component: SmartServiceReleasesComponent;
    let canProposeRelease: jasmine.Spy;
    let openDialog: jasmine.Spy;
    let navigate: jasmine.Spy;
    let snackOpen: jasmine.Spy;

    const release = (id: string, extra: object = {}) => ({
        id, name: 'name ' + id, description: '', design_id: 'd', created_at: 1760000000, svg_xml: '', bpmn_xml: '',
        permissions_info: { shared: false, permissions: { a: true, x: true, r: true, w: true } },
        ...extra,
    });

    async function init(releases: object[], proposable: string[], dialogResult: unknown = undefined) {
        canProposeRelease = jasmine.createSpy('canProposeRelease').and.callFake((r: { id: string }) => proposable.includes(r.id));
        openDialog = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(dialogResult) });
        navigate = jasmine.createSpy('navigate');
        snackOpen = jasmine.createSpy('open');
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, SmartServiceReleasesComponent],
            providers: [
                { provide: SmartServiceReleasesService, useValue: { userHasDeleteAuthorization: () => true, getExtendedReleaseList: () => of({ releases, total: releases.length }) } },
                { provide: SearchbarService, useValue: { currentSearchText: of(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map()) } },
                { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => null }) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: MatSnackBar, useValue: { open: snackOpen } },
                { provide: MatDialog, useValue: { open: openDialog } },
                { provide: DialogsService, useValue: {} },
                { provide: Router, useValue: { navigate } },
                { provide: UrlStateService, useClass: UrlStateServiceMock },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
                { provide: ContentReviewService, useValue: { canProposeRelease } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(SmartServiceReleasesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges(false);
        fixture.detectChanges();
    }

    async function menuLabels(row: number): Promise<string[]> {
        (fixture.nativeElement.querySelectorAll('tr[mat-row] button[aria-label="Actions"]')[row] as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/^\w+ /, ''));
    }

    it('offers the action between the downloads and Share on a release the check allows', async () => {
        await init([release('mine', { creator: 'me' })], ['mine']);

        expect(await menuLabels(0)).toEqual(['Launch instance', 'Show instances', 'Export to designer', 'Download BPMN', 'Download SVG', 'Propose for publication', 'Share', 'Delete']);
        expect(canProposeRelease).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'mine', creator: 'me' }));
    });

    it('hides the action on a release the check does not allow', async () => {
        await init([release('other', { creator: 'someone-else' })], []);

        expect(await menuLabels(0)).not.toContain('Propose for publication');
    });

    it('opens the propose dialog for the release', async () => {
        await init([release('mine', { creator: 'me' })], ['mine']);

        component.proposeForPublication(component.dataSource.data[0]);

        expect(openDialog).toHaveBeenCalledTimes(1);
        const [dialog, config] = openDialog.calls.mostRecent().args;
        expect(dialog).toBe(ProposeDialogComponent);
        expect(config.data).toEqual({ releaseId: 'mine', name: 'name mine' });
        expect(config.width).toBe('600px');
    });

    it('reports the new request and opens its detail page once the dialog created it', async () => {
        await init([release('mine', { creator: 'me' })], ['mine'], { id: 'req-9' });

        component.proposeForPublication(component.dataSource.data[0]);

        expect(snackOpen).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledOnceWith(['/smart-services/requests', 'req-9']);
    });

    it('does nothing when the dialog was cancelled', async () => {
        await init([release('mine', { creator: 'me' })], ['mine'], undefined);

        component.proposeForPublication(component.dataSource.data[0]);

        expect(snackOpen).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });
});
