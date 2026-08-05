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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from '../../../modules/devices/device-groups/shared/device-groups.model';
import { DeviceGroupsService } from '../../../modules/devices/device-groups/shared/device-groups.service';
import { DeviceTypeFunctionModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { ConceptsService } from '../../../modules/metadata/concepts/shared/concepts.service';
import { DeviceClassesService } from '../../../modules/metadata/device-classes/shared/device-classes.service';
import { FunctionsService } from '../../../modules/metadata/functions/shared/functions.service';
import { FloorplanEditDialogComponent } from './floorplan-edit-dialog.component';

describe('FloorplanEditDialogComponent', () => {
    let component: FloorplanEditDialogComponent;
    let fixture: ComponentFixture<FloorplanEditDialogComponent>;
    const deviceGroupsSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const conceptsSpy: Spy<ConceptsService> = createSpyFromClass<ConceptsService>(ConceptsService);

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [FloorplanEditDialogComponent],
            imports: [ReactiveFormsModule],
            providers: [
                { provide: MatDialogRef, useValue: createSpyFromClass<MatDialogRef<FloorplanEditDialogComponent>>(MatDialogRef) },
                { provide: MAT_DIALOG_DATA, useValue: { widgetId: 'widgetId', dashboardId: 'dashboardId', aspectRatio: 1 } },
                { provide: DashboardService, useValue: createSpyFromClass<DashboardService>(DashboardService) },
                { provide: ErrorHandlerService, useValue: createSpyFromClass<ErrorHandlerService>(ErrorHandlerService) },
                { provide: DeviceGroupsService, useValue: deviceGroupsSpy },
                { provide: FunctionsService, useValue: createSpyFromClass<FunctionsService>(FunctionsService) },
                { provide: DeviceClassesService, useValue: createSpyFromClass<DeviceClassesService>(DeviceClassesService) },
                { provide: ConceptsService, useValue: conceptsSpy },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FloorplanEditDialogComponent);
        component = fixture.componentInstance;
        // no detectChanges(): ngOnInit would load the widget, these tests only cover the form
        spyOn(component, 'draw');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('does not show the table of unplaced elements by default', () => {
        expect(component.form.controls.showUnplacedTable.value).toBeFalse();
    });

    it('creates new placements without a position', () => {
        component.addNewPlacement();

        const tab = component.form.controls.placements.at(0);
        expect(component.isPlaced(tab)).toBeFalse();
        expect(tab.value.position).toEqual({ x: null, y: null });
    });

    it('removes the position of a placed element', () => {
        component.addNewPlacement();
        const tab = component.form.controls.placements.at(0);
        tab.patchValue({ position: { x: 0.5, y: 0.5 } });
        expect(component.isPlaced(tab)).toBeTrue();

        component.removePosition(0);

        expect(component.isPlaced(tab)).toBeFalse();
        expect(component.draw).toHaveBeenCalled();
    });

    it('keeps the alias display settings of an existing placement', () => {
        const tab = component.newPlacement({
            alias: 'Kitchen',
            showAlias: true,
            showAliasWhenZoomed: true,
        } as any);

        expect(tab.value.alias).toBe('Kitchen');
        expect(tab.value.showAlias).toBeTrue();
        expect(tab.value.showAliasWhenZoomed).toBeTrue();
    });

    describe('selectable controls', () => {
        const setPosition = 'urn:infai:ses:controlling-function:set-position';
        const getPosition = 'urn:infai:ses:measuring-function:get-position';
        const setColor = 'urn:infai:ses:controlling-function:set-color';

        const criteria = (functionId: string): DeviceGroupCriteriaModel =>
            ({ function_id: functionId, aspect_id: 'room', device_class_id: 'curtain', interaction: '' });

        const fn = (id: string, conceptId: string): DeviceTypeFunctionModel =>
            ({ id, name: id, display_name: id, description: '', rdf_type: '', concept_id: conceptId });

        beforeEach(() => {
            deviceGroupsSpy.getFunctionListByIds.and.returnValue(of([]));
            conceptsSpy.getConceptsWithCharacteristics.and.returnValue(of({ result: [], total: 0 }));
            component.deviceGroups = [{
                id: 'deviceGroupId',
                criteria: [criteria(getPosition), criteria(setPosition), criteria(setColor)],
            } as DeviceGroupModel];
            component.functions = [fn(getPosition, 'position'), fn(setPosition, 'position'), fn(setColor, 'color')];
            component.aspects = [{
                id: 'room', name: 'Room', root_id: 'room', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [],
            }];
        });

        const tabWith = (value: any) => {
            component.addNewPlacement();
            const tab = component.form.controls.placements.at(0);
            tab.patchValue({ deviceGroupId: 'deviceGroupId', ...value });
            return tab;
        };

        it('offers every control of the group while no measurement is displayed', () => {
            const tab = tabWith({});

            expect(component.getSelectableControllingCriteria(tab).map(c => c.function_id)).toEqual([setPosition, setColor]);
        });

        it('leaves out the control a displayed measurement already gives access to', () => {
            // the widget operates that one through the value it shows for the measurement
            const tab = tabWith({ criteria: criteria(getPosition) });

            expect(component.getSelectableControllingCriteria(tab).map(c => c.function_id)).toEqual([setColor]);
        });

        it('leaves out the control of a measurement selected for the tooltip', () => {
            const tab = tabWith({ tooltipCriteria: [criteria(getPosition)] });

            expect(component.getSelectableControllingCriteria(tab).map(c => c.function_id)).toEqual([setColor]);
        });
    });
});
