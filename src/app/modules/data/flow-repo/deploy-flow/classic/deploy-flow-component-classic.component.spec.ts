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
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DeployFlowClassicComponent', () => {
    let component: DeployFlowClassicComponent;
    let fixture: ComponentFixture<DeployFlowClassicComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [DeployFlowClassicComponent],
    imports: [MatSnackBarModule,
        MatDialogModule,
        CoreModule,
        InfiniteScrollModule],
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
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
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
