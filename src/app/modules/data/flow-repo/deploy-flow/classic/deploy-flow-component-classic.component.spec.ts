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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { DeployFlowClassicComponent } from './deploy-flow-component-classic.component';
import { CoreModule } from '../../../../../core/core.module';
import { AuthorizationService } from '../../../../../core/services/authorization.service';
import { AuthorizationServiceMock } from '../../../../../core/services/authorization.service.mock';
import { DialogsService } from '../../../../../core/services/dialogs.service';
import {ActivatedRoute, provideRouter} from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DeviceInstancesService } from '../../../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ParserService } from '../../shared/parser.service';
import { FlowEngineService } from '../../shared/flow-engine.service';

describe('DeployFlowClassicComponent', () => {
    let component: DeployFlowClassicComponent;
    let fixture: ComponentFixture<DeployFlowClassicComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [MatSnackBarModule,
                    MatDialogModule,
                    CoreModule,
                    InfiniteScrollModule, DeployFlowClassicComponent],
                providers: [
                    provideRouter([]),
                    { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                    DialogsService,
                    {
                        provide: ActivatedRoute,
                        useValue: {
                            snapshot: {
                                paramMap: {
                                    get(): string {
                                        return '123';
                                    },
                                },
                            },
                        },
                    },
                    provideHttpClient(withXhr(), withInterceptorsFromDi()),
                    provideHttpClientTesting(),
                ],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(DeployFlowClassicComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should parse inputs', () => {
        expect(component.selectedValues).toBeTruthy();
    });
});

describe('DeployFlowClassicComponent start', () => {
    let component: DeployFlowClassicComponent;
    let flowEngine: jasmine.SpyObj<FlowEngineService>;
    let router: jasmine.SpyObj<Router>;
    let snackBar: { open: jasmine.Spy };

    beforeEach(() => {
        flowEngine = jasmine.createSpyObj<FlowEngineService>('FlowEngineService', ['startPipeline']);
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        snackBar = { open: jasmine.createSpy('open') };
        TestBed.configureTestingModule({
            providers: [
                { provide: FlowEngineService, useValue: flowEngine },
                { provide: Router, useValue: router },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: ParserService, useValue: { getInputs: () => of([]) } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstances: () => of({ result: [], total: 0 }) } },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'flow' } } } },
            ],
        });
        TestBed.overrideTemplate(DeployFlowClassicComponent, '');
        component = TestBed.createComponent(DeployFlowClassicComponent).componentInstance;
    });

    it('goes to the pipeline list and reports success when the pipeline started', () => {
        flowEngine.startPipeline.and.returnValue(of({}));
        component.startPipeline();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/data/pipelines']);
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Pipeline started');
    });

    it('stays and names the action when starting the pipeline failed', () => {
        flowEngine.startPipeline.and.returnValue(of(null));
        component.startPipeline();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledOnceWith('The pipeline could not be started', 'close', { panelClass: 'snack-bar-error' });
    });
});
