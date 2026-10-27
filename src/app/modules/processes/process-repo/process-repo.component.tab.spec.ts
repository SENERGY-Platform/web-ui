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

import { discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { ProcessRepoComponent } from './process-repo.component';
import { ProcessRepoService } from './shared/process-repo.service';
import { CoreModule } from '../../../core/core.module';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { UtilService } from '../../../core/services/util.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsMockService } from '../../permissions/shared/permissions.service.mock';

describe('ProcessRepoComponent tabs and the search in the URL', () => {
    it('clears the search in the URL and in the searchbars when the tab changes', fakeAsync(() => {
        const getProcessModels = jasmine.createSpy('getProcessModels').and.returnValue(of({ result: [], total: 0 }));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ProcessRepoComponent],
            imports: [CoreModule, NoopAnimationsModule, MatTabsModule],
            providers: [
                provideRouter([]),
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                {
                    provide: ProcessRepoService,
                    useValue: {
                        getProcessModels,
                        userHasCreateAuthorization: () => false,
                        userHasUpdateAuthorization: () => false,
                        userHasDeleteAuthorization: () => false,
                    },
                },
                { provide: AuthorizationService, useValue: { getUserId: () => 'u1' } },
                { provide: PermissionsService, useClass: PermissionsMockService },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map<string, string>()) } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: ResponsiveService, useValue: { getActiveMqAlias: () => 'md', observeMqAlias: () => of('md') } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
            ],
        });
        const router = TestBed.inject(Router);
        router.navigateByUrl('/?search=foo');
        tick();
        const fixture = TestBed.createComponent(ProcessRepoComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
        expect(getProcessModels.calls.mostRecent().args[0]).toBe('foo');

        (fixture.nativeElement.querySelectorAll('[role="tab"]')[1] as HTMLElement).click();
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();
        flush();

        expect(router.url).toBe('/?tab=1');
        expect(fixture.componentInstance.searchText).toBe('');
        const searchbars = fixture.debugElement.queryAll(By.directive(SearchbarComponent));
        expect(searchbars.length).toBeGreaterThan(0);
        searchbars.forEach((searchbar) => {
            expect((searchbar.componentInstance as SearchbarComponent).formControl.value).toBe('');
        });
    }));
});
