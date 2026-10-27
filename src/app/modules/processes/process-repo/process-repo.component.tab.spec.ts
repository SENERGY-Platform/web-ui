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
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ProcessRepoComponent } from './process-repo.component';
import { ProcessRepoService } from './shared/process-repo.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { PreferencesService } from '../../../core/services/preferences.service';

// Real router, searchbar and tab group: every tab has its own searchbar next to the one shared URL.
describe('ProcessRepoComponent search across tabs', () => {
    let fixture: ComponentFixture<ProcessRepoComponent>;
    let router: Router;
    let getModels: jasmine.Spy;

    function open(url: string): void {
        getModels = jasmine.createSpy('getProcessModels').and.callFake(() => of({ result: [], total: 0 }).pipe(delay(1)));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProcessRepoComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ProcessRepoService,
                    useValue: {
                        getProcessModels: getModels,
                        userHasCreateAuthorization: () => true,
                        userHasUpdateAuthorization: () => true,
                        userHasDeleteAuthorization: () => true,
                    },
                },
                { provide: AuthorizationService, useValue: { getUserId: () => 'u1' } },
                { provide: PermissionsService, useValue: { getComputedResourcePermissionsV2: () => of([]) } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map()) } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        router = TestBed.inject(Router);
        router.navigateByUrl(url);
        tick();
        fixture = TestBed.createComponent(ProcessRepoComponent);
        fixture.detectChanges();
        settle();
    }

    function settle(): void {
        tick(400);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    const searchTexts = (): string[] => Array.from(fixture.nativeElement.querySelectorAll('senergy-searchbar input')).map((i) => (i as HTMLInputElement).value);

    it('clears the search in the URL and in the searchbar of the tab it switches to', fakeAsync(() => {
        open('/?search=foo');
        expect(getModels.calls.mostRecent().args[0]).toBe('foo');
        expect(searchTexts()).toEqual(['foo']);

        (fixture.nativeElement.querySelectorAll('[role="tab"]')[1] as HTMLElement).click();
        fixture.detectChanges();
        settle();

        expect(getModels.calls.mostRecent().args[0]).toBe('');
        expect(router.url).toBe('/?tab=1');
        expect(searchTexts()).toEqual(['']);
    }));
});
