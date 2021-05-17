/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this fi8le except in compliance with the License.
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

import {ComponentFixture, TestBed} from '@angular/core/testing';

import {NetworksDeleteDialogComponent} from './networks-delete-dialog.component';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatTableModule} from '@angular/material/table';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {DeviceInstancesService} from '../../device-instances/shared/device-instances.service';
import {NetworksService} from '../shared/networks.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';

const deviceInstancesServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass(DeviceInstancesService);
const networksServiceSpy: Spy<NetworksService> = createSpyFromClass(NetworksService);

describe('NetworksDeleteDialogComponent', () => {
    let component: NetworksDeleteDialogComponent;
    let fixture: ComponentFixture<NetworksDeleteDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [NetworksDeleteDialogComponent],
            imports: [
                MatDialogModule,
                MatTableModule,
                MatTooltipModule,
                MatCheckboxModule,
                MatSnackBarModule,
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA, useValue: {networkId: 'id', devices: []},
                },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (_: any) => null
                    }
                },
                {
                    provide: DeviceInstancesService,
                    useValue: deviceInstancesServiceSpy,
                },
                {
                    provide: NetworksService,
                    useValue: networksServiceSpy,
                },
            ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(NetworksDeleteDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
