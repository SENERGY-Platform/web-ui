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
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { SmartServiceReleasesComponent } from './releases.component';
import { SmartServiceReleasesService } from './shared/release.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { UtilService } from '../../../core/services/util.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceInstanceDialogService } from '../instances/shared/instance-dialog.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';

describe('SmartServiceReleasesComponent', () => {
    let fixture: ComponentFixture<SmartServiceReleasesComponent>;

    const release = (id: string, changed?: any[]) => ({
        id, name: id, description: '', design_id: 'd', created_at: 1760000000, svg_xml: '', bpmn_xml: '',
        permissions_info: { shared: false, permissions: { a: true, x: true, r: true, w: true } },
        changed_resources: changed,
    });

    beforeEach(() => {
        const list = { releases: [release('plain'), release('changed', [{ kind: 'flow', id: 'flow-1', reason: 'gone', at: 1760000000 }])], total: 2 };
        TestBed.configureTestingModule({
            imports: [SmartServiceReleasesComponent],
            providers: [
                { provide: SmartServiceReleasesService, useValue: { userHasDeleteAuthorization: () => false, getExtendedReleaseList: () => of(list) } },
                { provide: SearchbarService, useValue: { currentSearchText: of(''), changeMessage: () => undefined } },
                { provide: ResponsiveService, useValue: { getActiveMqAlias: () => 'lg', observeMqAlias: () => of('lg') } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map()) } },
                { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => null }) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: Router, useValue: {} },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
            ],
        });
        fixture = TestBed.createComponent(SmartServiceReleasesComponent);
    });

    it('renders releases with and without changed resources and hints only at the changed one', () => {
        // the stubbed answer is synchronous, so ready flips inside the first check; the app gets it asynchronously
        fixture.detectChanges(false);
        fixture.detectChanges();

        expect(fixture.debugElement.queryAll(By.css('mat-grid-tile')).length).toBe(2);
        const icons = fixture.debugElement.queryAll(By.css('senergy-changed-resources-hint mat-icon'));
        expect(icons.length).toBe(1);
        expect(icons[0].injector.get(MatTooltip).message).toContain('Flow flow-1: gone on');
    });
});
