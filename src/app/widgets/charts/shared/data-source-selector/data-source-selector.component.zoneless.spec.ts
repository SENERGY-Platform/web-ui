/*
 * Copyright 2025 InfAI (CC SES)
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
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { MtxSelect } from '@ng-matero/extensions/select';

import { DataSourceSelectorComponent } from './data-source-selector.component';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { ChartsExportRangeTimeTypeEnum } from '../../export/shared/charts-export-range-time-type.enum';

const FLOAT = 'https://schema.org/Float';
const DEVICES = 0;

// The component is OnPush and runs without zone.js here: every repaint must come from a signal the template reads.
describe('DataSourceSelectorComponent without zone.js', () => {
    let fixture: ComponentFixture<DataSourceSelectorComponent>;
    let component: DataSourceSelectorComponent;
    let deviceTypeService: Spy<DeviceTypeService>;
    let deviceInstancesService: Spy<DeviceInstancesService>;
    let functions: Subject<any>;

    const device = (id: string) => ({ id, name: 'Dev', display_name: id, device_type_id: 'dt1' });
    const deviceType = () => ({
        id: 'dt1', device_class_id: 'dc1',
        services: [{ id: 's1', name: 'svc', interaction: 'event', outputs: [{ content_variable: { name: 'root' } }] }],
    });
    const spinners = () => fixture.nativeElement.querySelectorAll('mat-spinner').length;
    const headings = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('h2')).map(h => h.textContent!.trim());
    const deviceItems = () => fixture.debugElement.queryAll(By.directive(MtxSelect))[1 + DEVICES].componentInstance.items as { id: string }[];
    const nextTimerTick = () => new Promise<void>(resolve => setTimeout(resolve));

    beforeEach(async () => {
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getDeviceType.and.returnValue(of(deviceType() as any));
        deviceTypeService.getValuePathsAndTypes.and.returnValue([{ path: 'temp', type: FLOAT }]);
        deviceInstancesService = createSpyFromClass(DeviceInstancesService);
        deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device('urn:infai:ses:device:1')], total: 1 } as any));
        const exportService = createSpyFromClass(ExportService);
        exportService.getExports.and.returnValue(of({ instances: [] } as any));
        const deviceGroupsService = createSpyFromClass(DeviceGroupsService);
        deviceGroupsService.getDeviceGroups.and.returnValue(of({ result: [], total: 0 } as any));
        functions = new Subject<any>();
        const functionsService = createSpyFromClass(FunctionsService);
        functionsService.getFunctions.and.returnValue(functions);

        TestBed.configureTestingModule({
            imports: [DataSourceSelectorComponent],
            providers: [
                provideZonelessChangeDetection(),
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: ConceptsService, useValue: createSpyFromClass(ConceptsService) },
                { provide: ExportService, useValue: exportService },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceGroupsService, useValue: deviceGroupsService },
                { provide: LocationsService, useValue: createSpyFromClass(LocationsService) },
                { provide: FunctionsService, useValue: functionsService },
            ],
        });
        fixture = TestBed.createComponent(DataSourceSelectorComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    async function loaded() {
        functions.next({ result: [], total: 0 });
        functions.complete();
        await fixture.whenStable();
    }

    it('swaps the initial spinner for the form once the sources are loaded', async () => {
        expect(spinners()).toBe(1);
        expect(fixture.nativeElement.querySelector('form')).toBeNull();

        await loaded();

        expect(spinners()).toBe(0);
        expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    it('fills the open device list when the scroll end loads the next batch', async () => {
        await loaded();
        expect(deviceItems().map(i => i.id)).toEqual(['urn:infai:ses:device:1']);
        deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device('urn:infai:ses:device:2')], total: 2 } as any));

        component.onSelectScrollEnd(component.form.controls.exportsBySource.at(DEVICES));
        await fixture.whenStable();

        expect(deviceItems().map(i => i.id)).toEqual(['urn:infai:ses:device:1', 'urn:infai:ses:device:2']);
    });

    it('refills the open device list from the first page when the select closes', async () => {
        await loaded();
        component.onSelectScrollEnd(component.form.controls.exportsBySource.at(DEVICES));
        deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device('urn:infai:ses:device:9')], total: 1 } as any));

        component.onSelectClose(component.form.controls.exportsBySource.at(DEVICES));
        await fixture.whenStable();

        expect(deviceItems().map(i => i.id)).toEqual(['urn:infai:ses:device:9']);
    });

    it('shows a spinner while the field options of a new selection load and the form again afterwards', async () => {
        await loaded();
        const deviceType$ = new Subject<any>();
        deviceTypeService.getDeviceType.and.returnValue(deviceType$);

        component.form.controls.exportsBySource.at(DEVICES).controls.sourceExports.setValue(['urn:infai:ses:device:1']);
        await fixture.whenStable();
        expect(spinners()).toBe(1);
        expect(headings()).toEqual(['Select the Data Sources']);

        deviceType$.next(deviceType());
        deviceType$.complete();
        await nextTimerTick();
        await fixture.whenStable();

        expect(spinners()).toBe(0);
        expect(headings().length).toBe(4);
        expect(component.fieldOptionsTMP.map(f => f.valueName)).toEqual(['svc: temp']);
        expect(fixture.nativeElement.querySelector('span[hidden]')).toBeNull();
    });

    it('shows the inputs of the chosen time range type', async () => {
        await loaded();
        const inputs = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('input[formControlName]')).map(i => i.getAttribute('formControlName'));
        expect(inputs()).not.toContain('start');

        component.form.get('timeRange.type')!.setValue(ChartsExportRangeTimeTypeEnum.Absolute);
        await fixture.whenStable();

        expect(inputs()).toContain('start');
        expect(inputs()).toContain('end');
    });
});
