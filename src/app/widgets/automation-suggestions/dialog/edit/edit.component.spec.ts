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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { AutomationSuggestionsEditComponent } from './edit.component';

describe('AutomationSuggestionsEditComponent', () => {
    let component: AutomationSuggestionsEditComponent;
    let fixture: ComponentFixture<AutomationSuggestionsEditComponent>;

    const instance = (id: string, releaseId: string) => ({ id, name: 'Instance ' + id, release_id: releaseId } as SmartServiceInstanceModel);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AutomationSuggestionsEditComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { dashboardId: 'd1', widgetId: 'w1', userHasUpdateNameAuthorization: false, userHasUpdatePropertiesAuthorization: true } },
                { provide: MatDialogRef, useValue: { close: () => {} } },
                { provide: DashboardService, useValue: {
                    getWidget: () => of({ id: 'w1', name: 'Suggestions', type: 'automation_suggestions', properties: { automationSuggestions: { instanceId: 'i-2' } } }),
                } },
                { provide: SmartServiceInstanceService, useValue: {
                    getInstances: () => of({ instances: [instance('i-1', 'rel-auto'), instance('i-2', 'rel-auto'), instance('i-3', 'rel-other')], total: 3 }),
                } },
                { provide: SmartServiceReleasesService, useValue: {
                    getReleaseList: () => of({ releases: [
                        { id: 'rel-auto', name: 'Automatisierungsvorschläge', design_id: '', description: '', created_at: '' },
                        { id: 'rel-other', name: 'Something else', design_id: '', description: '', created_at: '' },
                    ], total: 2 }),
                } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AutomationSuggestionsEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('offers only the instances of the release Automatisierungsvorschläge', () => {
        expect(component.instances.map((i) => i.id)).toEqual(['i-1', 'i-2']);
    });

    it('preselects the instance stored in the widget properties', () => {
        expect(component.ready).toBeTrue();
        expect(component.form.controls.instance.value?.id).toBe('i-2');
    });
});
