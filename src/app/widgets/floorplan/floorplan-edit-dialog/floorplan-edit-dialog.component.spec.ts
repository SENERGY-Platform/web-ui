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
import { PhotonService } from '../../../core/services/photon.service';
import { Map as OlMap, View } from 'ol';
import { useGeographic } from 'ol/proj';

describe('FloorplanEditDialogComponent', () => {
    let component: FloorplanEditDialogComponent;
    let fixture: ComponentFixture<FloorplanEditDialogComponent>;
    const deviceGroupsSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const conceptsSpy: Spy<ConceptsService> = createSpyFromClass<ConceptsService>(ConceptsService);

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [ReactiveFormsModule, FloorplanEditDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: createSpyFromClass<MatDialogRef<FloorplanEditDialogComponent>>(MatDialogRef) },
                { provide: MAT_DIALOG_DATA, useValue: { widgetId: 'widgetId', dashboardId: 'dashboardId', aspectRatio: 1 } },
                { provide: DashboardService, useValue: createSpyFromClass<DashboardService>(DashboardService) },
                { provide: ErrorHandlerService, useValue: createSpyFromClass<ErrorHandlerService>(ErrorHandlerService) },
                { provide: DeviceGroupsService, useValue: deviceGroupsSpy },
                { provide: FunctionsService, useValue: createSpyFromClass<FunctionsService>(FunctionsService) },
                { provide: DeviceClassesService, useValue: createSpyFromClass<DeviceClassesService>(DeviceClassesService) },
                { provide: ConceptsService, useValue: conceptsSpy },
                { provide: PhotonService, useValue: createSpyFromClass<PhotonService>(PhotonService) },
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

    it('does not start placing while a map section is chosen', () => {
        component.addNewPlacement();
        component.selectingSection = true;

        component.placePlacement(0);

        expect(component.placing).toBeUndefined();
    });

    describe('the coloured area of a placement', () => {
        /** A click on the image, whose offsets placeSelected reads; the shift puts the image at 1:1. */
        const clickAt = (x: number, y: number) => {
            component.drawShift = { centerShiftX: 0, centerShiftY: 0, ratio: 1 };
            component.placeSelected({ offsetX: x, offsetY: y } as MouseEvent);
        };

        beforeEach(() => {
            component.addNewPlacement();
        });

        it('starts empty, so the placement shows its pill', () => {
            expect(component.zoneOf(0)).toEqual([]);
        });

        it('collects a corner per click while it is being drawn', () => {
            component.drawZone(0);
            clickAt(10, 20);
            clickAt(30, 40);

            expect(component.zoneDraft.length).toBe(2);
            // the position stays untouched; a click is a corner now, not a placement
            expect(component.form.controls.placements.at(0).value.position).toEqual({ x: null, y: null });
        });

        it('takes the last corner back', () => {
            component.drawZone(0);
            clickAt(10, 20);
            clickAt(30, 40);
            component.undoZoneCorner();

            expect(component.zoneDraft.length).toBe(1);
        });

        it('keeps the area once three corners are set', () => {
            component.drawZone(0);
            clickAt(10, 20);
            clickAt(30, 20);
            clickAt(30, 40);
            component.finishZone();

            expect(component.zoneOf(0).length).toBe(3);
            expect(component.drawingZone).toBeUndefined();
            expect(component.zoneDraft).toEqual([]);
        });

        it('leaves the placement alone when too few corners were set', () => {
            component.drawZone(0);
            clickAt(10, 20);
            component.finishZone();

            expect(component.zoneOf(0)).toEqual([]);
        });

        it('throws the draft away when it is discarded', () => {
            component.drawZone(0);
            clickAt(10, 20);
            component.cancelZone();

            expect(component.zoneOf(0)).toEqual([]);
            expect(component.drawingZone).toBeUndefined();
        });

        it('removes an area, so the placement shows its pill again', () => {
            component.form.controls.placements.at(0).patchValue({ zone: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] });

            component.removeZone(0);

            expect(component.zoneOf(0)).toEqual([]);
        });

        it('does not start drawing while a map section is chosen', () => {
            component.selectingSection = true;

            component.drawZone(0);

            expect(component.drawingZone).toBeUndefined();
        });
    });

    describe('map section', () => {
        const sectionMap = () => {
            useGeographic();
            return new OlMap({ view: new View({ center: [12.38, 51.34], zoom: 5 }), controls: [] });
        };

        it('is forgotten with the image', () => {
            component.form.patchValue({ image: 'data:image/webp;base64,', bbox: [10, 50, 12, 52] });

            component.removeImage();

            expect(component.form.controls.bbox.value).toBeNull();
        });

        it('keeps placed elements on their spot when it changes', () => {
            component.applySection('data:image/webp;base64,a', [10, 50, 12, 52]);
            component.addNewPlacement();
            component.form.controls.placements.at(0).patchValue({ position: { x: 0.75, y: 0.4 } });

            component.applySection('data:image/webp;base64,b', [11, 50, 12, 52]);

            const position = component.form.controls.placements.at(0).value.position;
            expect(position.x).toBeCloseTo(0.5, 9);
            expect(position.y).toBeCloseTo(0.4, 9);
            expect(component.form.value.image).toBe('data:image/webp;base64,b');
            expect(component.form.value.bbox).toEqual([11, 50, 12, 52]);
        });

        it('centers a found address', () => {
            // a map without layers, the basemap would be fetched from basemap.de
            component.sectionMap = sectionMap();

            component.showHit({ label: 'Augustusplatz 10, 04109 Leipzig', lon: 12.381, lat: 51.339 });

            const view = component.sectionMap!.getView();
            expect(view.getCenter()![0]).toBeCloseTo(12.381, 6);
            expect(view.getCenter()![1]).toBeCloseTo(51.339, 6);
            expect(view.getZoom()).toBe(18);
        });

        it('zooms the map section', () => {
            component.sectionMap = sectionMap();

            component.zoomSection(1);

            expect(component.sectionMap.getView().getZoom()).toBe(6);
        });

        it('centers the device position', () => {
            component.sectionMap = sectionMap();
            spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(success =>
                success({ coords: { longitude: 13.4, latitude: 52.5 } } as GeolocationPosition));

            component.locateMe();

            const view = component.sectionMap.getView();
            expect(view.getCenter()![0]).toBeCloseTo(13.4, 6);
            expect(view.getCenter()![1]).toBeCloseTo(52.5, 6);
            expect(view.getZoom()).toBe(18);
        });

        it('shows a found area as a whole', () => {
            // a map without layers, the basemap would be fetched from basemap.de
            component.sectionMap = sectionMap();

            component.showHit({ label: 'Leipzig', lon: 12.37, lat: 51.34, extent: [12.23, 51.23, 12.54, 51.45] });

            // fit() lands exactly on the extent, up to rounding
            const [west, south, east, north] = component.sectionMap!.getView().calculateExtent([100, 100]);
            expect(west).toBeLessThanOrEqual(12.23 + 1e-9);
            expect(south).toBeLessThanOrEqual(51.23 + 1e-9);
            expect(east).toBeGreaterThanOrEqual(12.54 - 1e-9);
            expect(north).toBeGreaterThanOrEqual(51.45 - 1e-9);
        });

        it('keeps the positions of an uploaded image when it is the first section', () => {
            component.addNewPlacement();
            component.form.controls.placements.at(0).patchValue({ position: { x: 0.75, y: 0.4 } });

            component.applySection('data:image/webp;base64,a', [11, 50, 12, 52]);

            expect(component.form.controls.placements.at(0).value.position).toEqual({ x: 0.75, y: 0.4 });
        });
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
