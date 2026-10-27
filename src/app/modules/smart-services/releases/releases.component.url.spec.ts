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

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { SmartServiceReleasesComponent } from './releases.component';
import { SmartServiceReleasesService } from './shared/release.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { UtilService } from '../../../core/services/util.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceInstanceDialogService } from '../instances/shared/instance-dialog.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { ContentReviewService } from '../requests/shared/content-review.service';

describe('SmartServiceReleasesComponent view state in the URL', () => {
    it('keeps the search in the URL when the id filter is removed', fakeAsync(() => {
        const getList = jasmine.createSpy('getExtendedReleaseList').and.callFake(() => of({ releases: [], total: 0 }));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, SmartServiceReleasesComponent],
            providers: [
                provideRouter([]),
                { provide: SmartServiceReleasesService, useValue: { userHasDeleteAuthorization: () => true, getExtendedReleaseList: getList } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map()) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
                { provide: ContentReviewService, useValue: { canProposeRelease: () => false } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        const router = TestBed.inject(Router);
        router.navigateByUrl('/?id=R&search=foo');
        tick();
        const fixture = TestBed.createComponent(SmartServiceReleasesComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        expect(fixture.componentInstance.id).toBe('R');

        fixture.componentInstance.removeIdFilter();
        tick(400);

        expect(router.url).toBe('/?search=foo');
        expect(getList.calls.mostRecent().args[2]).toBe('foo');
        expect(getList.calls.mostRecent().args[5]).toBeUndefined();
    }));
});
