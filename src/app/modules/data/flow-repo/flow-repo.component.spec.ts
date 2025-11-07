/*
 * Copyright 2020 InfAI (CC SES)
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

import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {FlowRepoComponent} from './flow-repo.component';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatDialogModule} from '@angular/material/dialog';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {AuthorizationServiceMock} from '../../../core/services/authorization.service.mock';
import {CoreModule} from '../../../core/core.module';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {FlowRepoService} from './shared/flow-repo.service';
import {FlowEngineService} from './shared/flow-engine.service';
import {By} from '@angular/platform-browser';
import {FlowModel} from './shared/flow.model';
import {of} from 'rxjs';
import {CostService} from '../../cost/shared/cost.service';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {NO_ERRORS_SCHEMA} from '@angular/core';

describe('FlowRepoComponent', () => {
    let component: FlowRepoComponent;
    let fixture: ComponentFixture<FlowRepoComponent>;
    const flowRepoServiceSpy: Spy<FlowRepoService> = createSpyFromClass(FlowRepoService);
    const flowEngineServiceSpy: Spy<FlowEngineService> = createSpyFromClass(FlowEngineService);
    flowRepoServiceSpy.userHasDeleteAuthorization.and.returnValue(true);
    flowRepoServiceSpy.userHasUpdateAuthorization.and.returnValue(true);
    flowRepoServiceSpy.userHasReadAuthorization.and.returnValue(true);

    const costServiceSpy: Spy<CostService> = createSpyFromClass(CostService);
    costServiceSpy.userMayGetFlowCostEstimations.and.returnValue(false);

    const testFlow: FlowModel = {
        _id: 'string',
        name: 'string',
        description: 'string',
        model: {cells: []},
        image: 'string',
        // share: {list: true,read: true, write: true},
        userName: undefined,
        userId: 'string',
        dateCreated: 1,
        dateUpdated: 1
    };
    flowRepoServiceSpy.getFlows.and.returnValue(of({flows: [testFlow]}));

    flowEngineServiceSpy.userHasCreateAuthorization.and.returnValue(true);
    flowEngineServiceSpy.userHasDeleteAuthorization.and.returnValue(true);
    flowEngineServiceSpy.userHasUpdateAuthorization.and.returnValue(true);

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                declarations: [FlowRepoComponent],
                imports: [MatSnackBarModule, MatDialogModule, CoreModule, InfiniteScrollModule],
                providers: [
                    {provide: AuthorizationService, useClass: AuthorizationServiceMock},
                    {provide: FlowRepoService, useValue: flowRepoServiceSpy},
                    {provide: FlowEngineService, useValue: flowEngineServiceSpy},
                    {provide: CostService, useValue: costServiceSpy},
                    DialogsService,
                    provideHttpClient(withInterceptorsFromDi()),
                    provideHttpClientTesting()
                ]
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        TestBed.overrideComponent(FlowRepoComponent, {
            set: {
                providers: [{provide: CostService, useValue: costServiceSpy}]
            }
        });
        fixture = TestBed.createComponent(FlowRepoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should disable delete button when not authorized', () => {
        fixture = TestBed.createComponent(FlowRepoComponent);
        flowRepoServiceSpy.userHasDeleteAuthorization.and.returnValue(false);
        component = fixture.componentInstance;
        component.getFlows(true);
        fixture.detectChanges();
        const btn = fixture.debugElement.query(By.css('.delete-button'));
        expect(btn.attributes['disabled']!).toBeDefined();
    });

    it('should show delete button when authorized', () => {
        fixture = TestBed.createComponent(FlowRepoComponent);
        flowRepoServiceSpy.userHasDeleteAuthorization.and.returnValue(true);
        component = fixture.componentInstance;
        component.getFlows(true);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.delete-button'))).toBeTruthy();
    });
});
