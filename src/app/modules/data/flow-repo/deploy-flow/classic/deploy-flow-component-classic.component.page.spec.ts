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
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
import { DeployFlowClassicComponent } from './deploy-flow-component-classic.component';
import { ParserService } from '../../shared/parser.service';
import { FlowEngineService } from '../../shared/flow-engine.service';
import { ParseModel } from '../../shared/parse.model';
import { DeviceInstancesService } from '../../../../devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../../../devices/device-instances/shared/device-instances.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';

describe('DeployFlowClassicComponent page while the devices load', () => {
    const inputs = [
        { id: 'op1', name: 'Operator 1', inPorts: ['in1', 'in2'], deploymentType: 'cloud', operatorId: 'operator-1', config: [] },
        { id: 'op2', name: 'Operator 2', inPorts: ['x'], deploymentType: 'local', operatorId: 'operator-2', config: [] },
        { id: 'op3', name: 'Operator 3', inPorts: ['y', 'z'], deploymentType: 'cloud', operatorId: 'operator-3', config: [] },
    ] as unknown as ParseModel[];
    const devices = [{ id: 'd1', display_name: 'Device 1' }] as DeviceInstanceModel[];

    let fixture: ComponentFixture<DeployFlowClassicComponent>;
    let deviceList: Subject<{ result: DeviceInstanceModel[]; total: number }>;

    beforeEach(() => {
        deviceList = new Subject();
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                provideRouter([]),
                { provide: FlowEngineService, useValue: { startPipeline: () => of({}) } },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                { provide: ParserService, useValue: { getInputs: () => of(inputs) } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstances: () => deviceList } },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'flow' } } } },
            ],
        });
        fixture = TestBed.createComponent(DeployFlowClassicComponent);
    });

    const titles = () => Array.from(fixture.nativeElement.querySelectorAll('senergy-form-section h3') as NodeListOf<HTMLElement>)
        .map((h) => h.textContent);

    it('renders every operator and the save bar before the device list arrives, and offers the devices once it does', () => {
        expect(() => fixture.detectChanges()).not.toThrow();

        expect(titles()).toEqual(['General', 'Operator 1', 'Operator 2', 'Operator 3', 'Global settings']);
        expect(fixture.nativeElement.querySelector('senergy-save-bar button.save')).not.toBeNull();
        expect(fixture.componentInstance.devices).toEqual([[[], []], [[]], [[], []]]);

        deviceList.next({ result: devices, total: 1 });
        deviceList.complete();
        expect(() => fixture.detectChanges()).not.toThrow();

        expect(fixture.componentInstance.devices).toEqual([[devices, devices], [devices], [devices, devices]]);
    });
});
