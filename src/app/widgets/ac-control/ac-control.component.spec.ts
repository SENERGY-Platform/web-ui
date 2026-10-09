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


import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, Observable, of } from 'rxjs';

import { AcControlComponent } from './ac-control.component';
import { AcControlElementModel } from './shared/ac-control.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeviceCommandResponseModel, DeviceCommandService } from '../../core/services/device-command.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';

describe('AcControlComponent command results', () => {
    let component: AcControlComponent;
    let runCommands: jasmine.Spy;
    let snackOpen: jasmine.Spy;

    const element = (value?: any): AcControlElementModel => ({ aspectId: 'a', functionId: 'f', serviceId: 's', value });
    const answer = (...codes: number[]): Observable<DeviceCommandResponseModel[]> => of(codes.map((code) => ({ status_code: code })));

    beforeEach(() => {
        runCommands = jasmine.createSpy('runCommands');
        snackOpen = jasmine.createSpy('open');
        TestBed.configureTestingModule({
            providers: [
                { provide: DashboardService, useValue: { initWidgetObservable: EMPTY } },
                { provide: DeviceCommandService, useValue: { runCommands } },
                { provide: MatDialog, useValue: {} },
                { provide: MatSnackBar, useValue: { open: snackOpen } },
            ],
        });
        component = TestBed.createComponent(AcControlComponent).componentInstance;
        component.widget = {
            id: 'w1',
            properties: {
                acControl: {
                    deviceId: 'd1',
                    minTarget: 10,
                    maxTarget: 30,
                    tempStep: 1,
                    getFanSpeedLevel: element(1),
                    setFanSpeedLevel: element(),
                    getTargetTemperature: [element(20), element(20)],
                    setTargetTemperature: [element(), element()],
                },
            },
        } as unknown as WidgetModel;
        localStorage.removeItem('w1_bufferTime');
        localStorage.removeItem('w1_bufferValue');
    });

    afterEach(() => {
        localStorage.removeItem('w1_bufferTime');
        localStorage.removeItem('w1_bufferValue');
    });

    const lastSnack = () => snackOpen.calls.mostRecent().args[0] as string;

    describe('runCommand', () => {
        it('shows the new value after a 200 answer', () => {
            runCommands.and.returnValue(answer(200));
            component.runCommand(component.widget.properties.acControl?.setFanSpeedLevel, 3);
            expect(component.widget.properties.acControl?.getFanSpeedLevel?.value).toBe(3);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('keeps the old value and names the action when the request failed ([])', () => {
            runCommands.and.returnValue(of([]));
            component.runCommand(component.widget.properties.acControl?.setFanSpeedLevel, 3);
            expect(component.widget.properties.acControl?.getFanSpeedLevel?.value).toBe(1);
            expect(lastSnack()).toContain('The command could not be sent to the device');
        });

        it('keeps the old value and names the action when the command answered with a non-200 status', () => {
            runCommands.and.returnValue(answer(500));
            component.runCommand(component.widget.properties.acControl?.setFanSpeedLevel, 3);
            expect(component.widget.properties.acControl?.getFanSpeedLevel?.value).toBe(1);
            expect(lastSnack()).toContain('The command could not be sent to the device');
        });
    });

    describe('setAllTargets', () => {
        it('shows and buffers the new target after only 200 answers', () => {
            runCommands.and.returnValue(answer(200, 200));
            component.setAllTargets(24);
            expect(component.widget.properties.acControl?.getTargetTemperature?.map((e) => e.value)).toEqual([24, 24]);
            expect(component.bufferedSetTemperature).toBe(24);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('keeps the old target and the buffer when the request failed ([])', () => {
            runCommands.and.returnValue(of([]));
            component.setAllTargets(24);
            expect(component.widget.properties.acControl?.getTargetTemperature?.map((e) => e.value)).toEqual([20, 20]);
            expect(component.bufferedSetTemperature).toBeNull();
            expect(lastSnack()).toContain('The target temperature could not be set');
        });

        it('keeps the old target when one of the commands answered with a non-200 status', () => {
            runCommands.and.returnValue(answer(200, 502));
            component.setAllTargets(24);
            expect(component.widget.properties.acControl?.getTargetTemperature?.map((e) => e.value)).toEqual([20, 20]);
            expect(component.bufferedSetTemperature).toBeNull();
            expect(lastSnack()).toContain('The target temperature could not be set');
        });
    });
});
