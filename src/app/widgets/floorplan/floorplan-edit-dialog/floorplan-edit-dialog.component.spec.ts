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
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeviceGroupsService } from '../../../modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from '../../../modules/metadata/concepts/shared/concepts.service';
import { DeviceClassesService } from '../../../modules/metadata/device-classes/shared/device-classes.service';
import { FunctionsService } from '../../../modules/metadata/functions/shared/functions.service';
import { FloorplanEditDialogComponent } from './floorplan-edit-dialog.component';

describe('FloorplanEditDialogComponent', () => {
    let component: FloorplanEditDialogComponent;
    let fixture: ComponentFixture<FloorplanEditDialogComponent>;

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
                { provide: DeviceGroupsService, useValue: createSpyFromClass<DeviceGroupsService>(DeviceGroupsService) },
                { provide: FunctionsService, useValue: createSpyFromClass<FunctionsService>(FunctionsService) },
                { provide: DeviceClassesService, useValue: createSpyFromClass<DeviceClassesService>(DeviceClassesService) },
                { provide: ConceptsService, useValue: createSpyFromClass<ConceptsService>(ConceptsService) },
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
});
