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
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { CriteriaListComponent } from './criteria-list.component';
import { CoreModule } from '../../../../../core/core.module';
import { AspectSelectComponent } from '../../../../../core/components/aspect-select/aspect-select.component';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { DeviceClassesService } from '../../../../metadata/device-classes/shared/device-classes.service';
import { DeviceTypeAspectNodeModel } from '../../../../metadata/device-types-overview/shared/device-type.model';

const node = (id: string, name: string): DeviceTypeAspectNodeModel => ({
    id,
    name,
    root_id: id,
    parent_id: '',
    child_ids: [],
    ancestor_ids: [],
    descendent_ids: [],
});

const air = node('urn:infai:ses:aspect:air', 'Air');
const water = node('urn:infai:ses:aspect:water', 'Water');

describe('CriteriaListComponent', () => {
    let fixture: ComponentFixture<CriteriaListComponent>;
    let component: CriteriaListComponent;
    let emitted: string[];

    // ngModel hands its value to the aspect select in a microtask, hence the wait for stability
    async function init(criteriaJson: string, listing: DeviceTypeAspectNodeModel[] = [air, water]) {
        const deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspectNodesWithMeasuringFunctionOfDevicesOnly.and.returnValue(of(listing));
        const functionsService = createSpyFromClass(FunctionsService);
        functionsService.getFunctions.and.returnValue(of({ result: [], total: 0 }));
        const deviceClassesService = createSpyFromClass(DeviceClassesService);
        deviceClassesService.getDeviceClasses.and.returnValue(of({ result: [], total: 0 }));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, FormsModule, MatExpansionModule, MatInputModule, MtxSelectModule, NoopAnimationsModule],
            declarations: [CriteriaListComponent],
            providers: [
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: FunctionsService, useValue: functionsService },
                { provide: DeviceClassesService, useValue: deviceClassesService },
                provideHttpClient(withInterceptorsFromDi()),
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CriteriaListComponent);
        component = fixture.componentInstance;
        component.criteria_json = criteriaJson;
        emitted = [];
        component.changed.subscribe((json: string) => emitted.push(json));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const selects = (): AspectSelectComponent[] =>
        fixture.debugElement.queryAll(By.directive(AspectSelectComponent)).map((d) => d.componentInstance);

    /** Picks aspects the way the user does: through the aspect select's own control. */
    function pick(index: number, aspectIds: string[]) {
        selects()[index].control.setValue(aspectIds);
        fixture.detectChanges();
    }

    it('writes a new criteria without aspect as before, with no list', async () => {
        await init('[]');
        component.criteriaList = component.addCriteria(component.criteriaList);
        component.emitUpdate();
        expect(emitted.pop()).toBe('[{"interaction":"request","aspect_id":"","device_class_id":"","function_id":""}]');
    });

    it('writes one picked aspect in both spellings', async () => {
        await init('[{"interaction":"request","aspect_id":"","device_class_id":"","function_id":""}]');
        pick(0, [air.id]);
        expect(emitted.pop()).toBe(
            `[{"interaction":"request","aspect_id":"${air.id}","device_class_id":"","function_id":"","aspect_ids":["${air.id}"]}]`,
        );
    });

    it('writes two picked aspects sorted by id, the first as the alias', async () => {
        await init('[{"interaction":"request","aspect_id":"","device_class_id":"","function_id":""}]');
        pick(0, [water.id, air.id]);
        expect(JSON.parse(emitted.pop() as string)).toEqual([
            { interaction: 'request', aspect_id: air.id, device_class_id: '', function_id: '', aspect_ids: [air.id, water.id] },
        ]);
    });

    it('writes no aspect once every aspect is removed again', async () => {
        await init(`[{"interaction":"request","aspect_id":"${air.id}","aspect_ids":["${air.id}"]}]`);
        pick(0, []);
        expect(JSON.parse(emitted.pop() as string)).toEqual([{ interaction: 'request', aspect_id: '' }]);
    });

    it('opens a criteria written before the list with its single aspect selected and named', async () => {
        await init(`[{"interaction":"request","aspect_id":"${air.id}"}]`);
        expect(selects()[0].control.value).toEqual([air.id]);
        expect(component.criteriaToLabel(component.criteriaList[0])).toBe('request | Air');
    });

    it('opens inconsistent fields with their union, and names every aspect', async () => {
        await init(`[{"aspect_id":"${water.id}","aspect_ids":["${air.id}"]}]`);
        expect(selects()[0].control.value).toEqual([air.id, water.id]);
        expect(component.criteriaToLabel(component.criteriaList[0])).toBe('Air, Water');
    });

    it('keeps a stored aspect the listing does not offer, named by its id, through an unrelated edit', async () => {
        const gone = 'urn:infai:ses:aspect:gone';
        await init(`[{"aspect_ids":["${gone}"]},{"aspect_id":""}]`);
        expect(selects()[0].aspectOptions.map((o) => o.name)).toContain(gone);
        pick(1, [air.id]);
        expect(JSON.parse(emitted.pop() as string)[0]).toEqual({ aspect_id: gone, aspect_ids: [gone] });
    });
});
