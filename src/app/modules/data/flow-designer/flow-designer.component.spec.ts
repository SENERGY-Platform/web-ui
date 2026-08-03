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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FlowDesignerComponent } from './flow-designer.component';
import { FlowModel } from '../flow-repo/shared/flow.model';
import { environment } from '../../../../environments/environment';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

describe('FlowDesignerComponent', () => {
    let component: FlowDesignerComponent;
    let fixture: ComponentFixture<FlowDesignerComponent>;
    let http: HttpTestingController;
    let router: Router;
    let paperSvg: SVGElement;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                declarations: [FlowDesignerComponent],
                imports: [MatDialogModule, MatSnackBarModule, NoopAnimationsModule],
                providers: [
                    provideRouter([]),
                    {
                        provide: ActivatedRoute,
                        useValue: {
                            snapshot: {
                                paramMap: {
                                    get(): string | null {
                                        return null;
                                    },
                                },
                            },
                        },
                    },
                    provideHttpClient(withInterceptorsFromDi()),
                    provideHttpClientTesting(),
                ],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        // saveModel() serializes the paper of the diagram editor, which is not rendered in the test
        paperSvg = document.createElementNS(SVG_NAMESPACE, 'svg');
        const layers = document.createElementNS(SVG_NAMESPACE, 'g');
        layers.setAttribute('class', 'joint-layers');
        paperSvg.appendChild(layers);
        document.body.appendChild(paperSvg);

        fixture = TestBed.createComponent(FlowDesignerComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
        component.diagram = {
            paperService: { getPaper: () => ({ svg: paperSvg }) },
            getGraph: () => ({ cells: [] }),
        } as any;
        component.flow = { name: 'my flow' } as FlowModel;
    });

    afterEach(() => {
        paperSvg.remove();
        http.verify();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('switches to editing the flow it just created', () => {
        const navigate = spyOn(router, 'navigate');

        component.saveModel();
        http.expectOne(environment.flowRepoUrl + '/flow/').flush({ _id: 'created-flow-id' }, { status: 201, statusText: 'Created' });

        expect(component.flow._id).toEqual('created-flow-id');
        expect(navigate).toHaveBeenCalledWith(['/data/designer', 'created-flow-id']);
    });

    it('overwrites the created flow on the next save instead of creating another one', () => {
        spyOn(router, 'navigate');

        component.saveModel();
        http.expectOne(environment.flowRepoUrl + '/flow/').flush({ _id: 'created-flow-id' }, { status: 201, statusText: 'Created' });

        component.saveModel();
        const update = http.expectOne(environment.flowRepoUrl + '/flow/created-flow-id/');
        expect(update.request.method).toEqual('POST');
        update.flush(null, { status: 200, statusText: 'OK' });
    });

    it('stays in create mode when the create response carries no id', () => {
        const navigate = spyOn(router, 'navigate');

        component.saveModel();
        http.expectOne(environment.flowRepoUrl + '/flow/').flush(null, { status: 201, statusText: 'Created' });

        expect(component.flow._id).toBeUndefined();
        expect(navigate).not.toHaveBeenCalled();
    });
});
