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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';

import { DataSourceConfig, DataSourceSelectorComponent } from './data-source-selector.component';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { ChartsExportVAxesModel } from '../../export/shared/charts-export-properties.model';
import { ChartsExportRangeTimeTypeEnum } from '../../export/shared/charts-export-range-time-type.enum';
import { environment } from 'src/environments/environment';

const FLOAT = 'https://schema.org/Float';
const EXPORT_ID = 'urn:infai:ses:export:e1';
const DEVICE_ID = 'urn:infai:ses:device:d1';
const GROUP_ID = 'urn:infai:ses:device-group:g1';
const LOCATION_ID = 'urn:infai:ses:location:l1';

// index of each class in exportsBySource
const DEVICES = 0, GROUPS = 1, EXPORTS = 2, LOCATIONS = 3;

describe('DataSourceSelectorComponent', () => {
    let component: DataSourceSelectorComponent;
    let fixture: ComponentFixture<DataSourceSelectorComponent>;
    let deviceTypeService: Spy<DeviceTypeService>;
    let conceptsService: Spy<ConceptsService>;
    let exportService: Spy<ExportService>;
    let deviceInstancesService: Spy<DeviceInstancesService>;
    let deviceGroupsService: Spy<DeviceGroupsService>;
    let locationsService: Spy<LocationsService>;
    let functionsService: Spy<FunctionsService>;

    const exportModel = (id = EXPORT_ID, name = 'Exp1', extra: object = {}) => ({
        ID: id, Name: name, ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
        Values: [{ InstanceID: EXPORT_ID, Name: 'temp', Type: FLOAT, Path: '' }], ...extra,
    });
    // an export as the config carries it, in contrast to the service model above
    const exportOption = (id = EXPORT_ID, name = 'Exp1', extra: object = {}) =>
        ({ id, name, values: exportModel().Values, exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb, ...extra });
    const device = (id = DEVICE_ID, extra: object = {}) => ({ id, name: 'Dev', display_name: 'Dev1', device_type_id: 'dt1', ...extra });
    const group = (id = GROUP_ID, extra: object = {}) => ({
        id, name: 'Group1',
        criteria: [{ function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc1', interaction: 'event' }], ...extra,
    });
    const location = (id = LOCATION_ID, extra: object = {}) => ({
        id, name: 'Loc1', device_ids: [], device_group_ids: [], ...extra,
    });
    const deviceType = () => ({
        id: 'dt1', device_class_id: 'dc1',
        services: [{
            id: 's1', name: 'svc', interaction: 'event',
            outputs: [{ content_variable: { name: 'root', sub_content_variables: [{ name: 'temp', aspect_id: 'asp1', function_id: 'fn1' }] } }],
        }],
    });
    const devicesRange = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => device('urn:infai:ses:device:' + (from + i)));
    const field = (extra: Partial<ChartsExportVAxesModel>): ChartsExportVAxesModel =>
        ({ exportName: 'x', valueName: 'y', valueType: 'float', math: '', color: '', ...extra });

    function sourceControl(index: number) {
        return component.form.controls.exportsBySource.at(index);
    }

    /** Creates the component; `before` runs between creation and the first change detection, the way an input binding would. */
    function create(config?: DataSourceConfig, inputs: Partial<DataSourceSelectorComponent> = {}, before?: () => void) {
        fixture = TestBed.createComponent(DataSourceSelectorComponent);
        component = fixture.componentInstance;
        component.dataSourceConfig = config;
        Object.assign(component, inputs);
        before?.();
        fixture.detectChanges();
    }

    function configure(template: string | null) {
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getDeviceType.and.returnValue(of(deviceType() as any));
        deviceTypeService.getValuePathsAndTypes.and.returnValue([{ path: 'temp', type: FLOAT }]);
        conceptsService = createSpyFromClass(ConceptsService);
        conceptsService.getConceptWithCharacteristics.and.returnValue(of({
            id: 'c1', base_characteristic_id: 'ch1', characteristics: [{ id: 'ch1', type: FLOAT }],
        } as any));
        exportService = createSpyFromClass(ExportService);
        exportService.getExports.and.returnValue(of({ instances: [exportModel()] } as any));
        deviceInstancesService = createSpyFromClass(DeviceInstancesService);
        deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device()], total: 1 } as any));
        deviceInstancesService.getDeviceInstance.and.returnValue(of(device() as any));
        deviceGroupsService = createSpyFromClass(DeviceGroupsService);
        deviceGroupsService.getDeviceGroups.and.returnValue(of({ result: [group()], total: 1 } as any));
        deviceGroupsService.getDeviceGroup.and.returnValue(of(group() as any));
        deviceGroupsService.getAspectListByIds.and.returnValue(of([]));
        deviceGroupsService.getDeviceClassListByIds.and.returnValue(of([]));
        locationsService = createSpyFromClass(LocationsService);
        locationsService.getLocations.and.returnValue(of({ result: [location()], total: 1 } as any));
        functionsService = createSpyFromClass(FunctionsService);
        functionsService.getFunctions.and.returnValue(of({
            result: [{ id: 'f1', name: 'Measure', display_name: 'Measure fn', concept_id: 'c1' }], total: 1,
        } as any));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [DataSourceSelectorComponent],
            providers: [
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: ConceptsService, useValue: conceptsService },
                { provide: ExportService, useValue: exportService },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceGroupsService, useValue: deviceGroupsService },
                { provide: LocationsService, useValue: locationsService },
                { provide: FunctionsService, useValue: functionsService },
            ],
        });
        if (template !== null) {
            TestBed.overrideTemplate(DataSourceSelectorComponent, template);
        }
    }

    describe('logic', () => {
        beforeEach(() => configure(''));

        describe('initialisation', () => {
            it('loads the first 30 of each enabled source and all functions, locations only on request', () => {
                create();

                expect(exportService.getExports).toHaveBeenCalledOnceWith(true, undefined, 30, 0, 'name', 'asc', undefined, undefined);
                expect(deviceInstancesService.getDeviceInstances).toHaveBeenCalledOnceWith({ limit: 30, offset: 0 });
                expect(deviceGroupsService.getDeviceGroups).toHaveBeenCalledOnceWith('', 30, 0, 'name', 'asc', false);
                expect(functionsService.getFunctions).toHaveBeenCalledOnceWith('', 9999, 0, 'name', 'asc');
                expect(locationsService.getLocations).not.toHaveBeenCalled();
            });

            it('loads locations when showLocationsAsSource is set and skips disabled sources', () => {
                create(undefined, { showLocationsAsSource: true, showExportsAsSource: false, showDevicesAsSource: false, showDeviceGroupsAsSource: false });

                expect(locationsService.getLocations).toHaveBeenCalledOnceWith({ limit: 30, offset: 0 });
                expect(exportService.getExports).not.toHaveBeenCalled();
                expect(deviceInstancesService.getDeviceInstances).not.toHaveBeenCalled();
                expect(deviceGroupsService.getDeviceGroups).not.toHaveBeenCalled();
                expect(component.getExportOptions('Locations').length).toBe(1);
            });

            it('is waiting until the sources are loaded, then ready', () => {
                const functions = new Subject<any>();
                functionsService.getFunctions.and.returnValue(functions);
                create();
                expect(component.ready).toBeFalse();
                expect(component.waitingForDataSourceChange).toBeTrue();

                functions.next({ result: [], total: 0 });
                functions.complete();

                expect(component.ready).toBeTrue();
                expect(component.waitingForDataSourceChange).toBeFalse();
            });

            it('becomes ready with a preselected location that has no devices and no groups', () => {
                create({ exports: [location() as any] }, { showLocationsAsSource: true });

                expect(component.ready).toBeTrue();
                expect(component.waitingForDataSourceChange).toBeFalse();
            });

            it('becomes ready even when loading fails', () => {
                spyOn(console, 'log');
                exportService.getExports.and.returnValue(throwError(() => new Error('boom')));
                create();

                expect(component.ready).toBeTrue();
                expect(component.waitingForDataSourceChange).toBeFalse();
            });

            it('fills the offered options with unselected sources and sets display names', () => {
                create();

                expect(component.getExportOptions('Exports')).toEqual([jasmine.objectContaining({ id: EXPORT_ID, name: 'Exp1', display_name: 'Exp1' })]);
                expect(component.getExportOptions('Devices')).toEqual([jasmine.objectContaining({ id: DEVICE_ID, display_name: 'Dev1' })]);
                expect(component.getExportOptions('Device Groups')).toEqual([jasmine.objectContaining({ id: GROUP_ID, display_name: 'Group1' })]);
                expect(component.getExportOptions('Unknown')).toEqual([]);
            });

            it('builds the form from the config', () => {
                create({
                    timeRange: { type: ChartsExportRangeTimeTypeEnum.Absolute, start: 's', end: 'e', time: 5, level: 'h' },
                    group: { time: 3, type: 'mean', level: 'm' },
                    fields: [field({ exportName: 'keep' })],
                });

                expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
                    timeRange: { type: ChartsExportRangeTimeTypeEnum.Absolute, start: 's', end: 'e', time: 5, level: 'h' },
                    group: { time: 3, type: 'mean', level: 'm' },
                    fields: [jasmine.objectContaining({ exportName: 'keep' })],
                    exports: [],
                    dataSourceClasses: [],
                }));
            });

            it('defaults the form to empty strings and lists without a config', () => {
                create();

                expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
                    timeRange: { type: '', start: '', end: '', time: '', level: '' },
                    group: { time: '', type: '', level: '' },
                    fields: [],
                    exports: [],
                }));
            });

            it('sorts preselected exports into their class by id and marks those classes chosen', () => {
                const preselected = [
                    { id: GROUP_ID, name: 'G' }, { id: DEVICE_ID, name: 'D' }, { id: EXPORT_ID, name: 'E' }, { id: LOCATION_ID, name: 'L' },
                ];
                create({ exports: preselected as any });

                expect(sourceControl(GROUPS).controls.sourceExports.value).toEqual([GROUP_ID]);
                expect(sourceControl(DEVICES).controls.sourceExports.value).toEqual([DEVICE_ID]);
                expect(sourceControl(EXPORTS).controls.sourceExports.value).toEqual([EXPORT_ID]);
                expect(sourceControl(LOCATIONS).controls.sourceExports.value).toEqual([LOCATION_ID]);
                expect(component.form.controls.dataSourceClasses.value).toEqual(['Devices', 'Device Groups', 'Exports', 'Locations']);
                expect(component.form.controls.exports.value).toEqual(preselected as any);
            });

            it('exposes the four source classes in a fixed order with their scroll defaults', () => {
                create();

                expect(component.form.controls.exportsBySource.getRawValue()).toEqual([
                    jasmine.objectContaining({ sourceClass: 'Devices', lastScrollStart: 0, lastScrollEnd: 30, lastSearch: '', lastOffset: 0 }),
                    jasmine.objectContaining({ sourceClass: 'Device Groups' }),
                    jasmine.objectContaining({ sourceClass: 'Exports' }),
                    jasmine.objectContaining({ sourceClass: 'Locations' }),
                ]);
            });

            it('loads the field options of the preselected sources and fills the options control', () => {
                create({ exports: [exportOption() as any] });

                const options = component.form.controls.fieldOptions.value as Map<string, ChartsExportVAxesModel[]>;
                expect(options.get('Exp1')).toEqual([jasmine.objectContaining({ instanceId: EXPORT_ID, valueName: 'temp', valueType: FLOAT })]);
                expect(component.fieldOptionsTMP).toEqual([jasmine.objectContaining({ valueName: 'temp', group: 'Exp1' })]);
            });
        });

        describe('updatedDataSourceConfig', () => {
            it('does not emit while initialising, including the field options patch', () => {
                fixture = TestBed.createComponent(DataSourceSelectorComponent);
                component = fixture.componentInstance;
                component.dataSourceConfig = { exports: [exportOption() as any] };
                const emitted = spyOn(component.updatedDataSourceConfig, 'emit');
                fixture.detectChanges();

                expect(component.ready).toBeTrue();
                expect(emitted).not.toHaveBeenCalled();
            });

            it('emits the raw form value once patchFields changes the fields, disabled controls included', () => {
                create({ timeRange: { type: ChartsExportRangeTimeTypeEnum.Relative, level: 'h' } });
                const emitted = spyOn(component.updatedDataSourceConfig, 'emit');
                const fields = [field({ exportName: 'patched' })];

                component.patchFields(fields);

                expect(emitted).toHaveBeenCalledTimes(1);
                const value = emitted.calls.mostRecent().args[0] as DataSourceConfig;
                expect(value.fields).toEqual(fields);
                expect(component.form.get('group.level')?.disabled).toBeTrue();
                expect(value.group).toEqual({ time: '', type: '', level: 'h' } as any);
                expect(Object.keys(value).sort()).toEqual(['dataSourceClasses', 'exports', 'exportsBySource', 'fieldOptions', 'fields', 'group', 'timeRange']);
            });

            it('patchFields leaves every other form value alone', () => {
                create({ group: { type: 'sum', time: 1, level: 'd' }, timeRange: { type: ChartsExportRangeTimeTypeEnum.Absolute, start: 'a' } });
                const before = component.form.getRawValue();

                component.patchFields([field({})]);

                expect(component.form.getRawValue()).toEqual({ ...before, fields: [field({})] });
            });
        });

        describe('time range and aggregation level', () => {
            it('disables the group level unless the time range is absolute', () => {
                create({ timeRange: { type: ChartsExportRangeTimeTypeEnum.Absolute } });
                const level = component.form.get('group.level')!;
                expect(level.enabled).toBeTrue();

                component.form.get('timeRange.type')!.setValue(ChartsExportRangeTimeTypeEnum.Relative);
                expect(level.disabled).toBeTrue();

                component.form.get('timeRange.type')!.setValue(ChartsExportRangeTimeTypeEnum.Absolute);
                expect(level.enabled).toBeTrue();
            });

            it('is disabled from the start for a relative or missing type', () => {
                create({ timeRange: { type: ChartsExportRangeTimeTypeEnum.RelativeAhead } });
                expect(component.form.get('group.level')!.disabled).toBeTrue();
            });

            it('mirrors the time range level into the disabled group level', () => {
                create({ timeRange: { type: ChartsExportRangeTimeTypeEnum.Relative, level: 'h' }, group: { level: 'd' } });
                expect(component.form.get('group.level')!.value).toBe('h');

                component.form.get('timeRange.level')!.setValue('m');
                expect(component.form.get('group.level')!.value).toBe('m');
            });

            it('keeps the group level independent when the type is absolute', () => {
                create({ timeRange: { type: ChartsExportRangeTimeTypeEnum.Absolute, level: 'h' }, group: { level: 'd' } });

                component.form.get('timeRange.level')!.setValue('m');

                expect(component.form.get('group.level')!.value).toBe('d');
            });
        });

        describe('validateInterval', () => {
            const timeControl = () => component.form.get('group.time')!;

            it('accepts any time while no aggregation type is chosen', () => {
                create();
                timeControl().setValue('nonsense');
                expect(timeControl().valid).toBeTrue();
            });

            it('requires a time once an aggregation type is chosen', () => {
                create();
                component.form.get('group.type')!.setValue('mean');
                timeControl().setValue('');
                expect(timeControl().errors).toEqual({ validateInterval: { value: '' } });
            });

            it('accepts a number with a unit and rejects anything else', () => {
                create();
                component.form.get('group.type')!.setValue('mean');
                for (const ok of ['15m', '1h', '3months', '10ms', '2y', '5µ']) {
                    timeControl().setValue(ok);
                    expect(timeControl().valid).withContext(ok).toBeTrue();
                }
                for (const bad of ['15', 'm', '15 m', '15mm', 'x15m']) {
                    timeControl().setValue(bad);
                    expect(timeControl().valid).withContext(bad).toBeFalse();
                }
            });
        });

        describe('selecting sources', () => {
            it('moves the chosen ids into exports, merged over all classes', () => {
                create();

                sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);
                sourceControl(DEVICES).controls.sourceExports.setValue([DEVICE_ID]);

                expect((component.form.controls.exports.value || []).map(e => e.id)).toEqual([DEVICE_ID, EXPORT_ID]);
                expect(component.selectedExportsBySource.get('Exports')?.length).toBe(1);
            });

            it('clears the exports of a class that is unchosen', () => {
                create();
                component.form.controls.dataSourceClasses.setValue(['Exports', 'Devices']);
                sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);
                sourceControl(DEVICES).controls.sourceExports.setValue([DEVICE_ID]);

                component.form.controls.dataSourceClasses.setValue(['Devices']);

                expect(sourceControl(EXPORTS).controls.sourceExports.value).toEqual([]);
                expect(sourceControl(DEVICES).controls.sourceExports.value).toEqual([DEVICE_ID]);
                expect((component.form.controls.exports.value || []).map(e => e.id)).toEqual([DEVICE_ID]);
            });

            it('sourceIsUsed follows the chosen classes', () => {
                create();
                component.form.controls.dataSourceClasses.setValue(['Exports']);

                expect(component.sourceIsUsed(sourceControl(EXPORTS))).toBeTrue();
                expect(component.sourceIsUsed(sourceControl(DEVICES))).toBeFalse();
                expect(component.getSourceClass(sourceControl(GROUPS))).toBe('Device Groups');
                expect(component.getSourceClass(component.form.controls.timeRange)).toBe('');
            });

            it('loads device group aspects and device classes when device groups are selected', () => {
                create();

                sourceControl(GROUPS).controls.sourceExports.setValue([GROUP_ID]);

                // getDeviceGroups clears the device class of every criterion, so none is requested
                expect(deviceGroupsService.getAspectListByIds).toHaveBeenCalledOnceWith(['a1']);
                expect(deviceGroupsService.getDeviceClassListByIds).toHaveBeenCalledOnceWith([]);
            });

            it('does not load aspects when another class is selected', () => {
                create();

                sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);

                expect(deviceGroupsService.getAspectListByIds).not.toHaveBeenCalled();
            });

            it('names criteria with the loaded aspect and device class', () => {
                deviceGroupsService.getAspectListByIds.and.returnValue(of([{ id: 'a1', name: 'Air' } as any]));
                deviceGroupsService.getDeviceClassListByIds.and.returnValue(of([{ id: 'dc1', name: 'Sensor' } as any]));
                create();
                const criteria = group().criteria[0];
                expect(component.describeCriteria()(criteria as any)).toBe('Measure fn  ');

                sourceControl(GROUPS).controls.sourceExports.setValue([GROUP_ID]);

                expect(component.describeCriteria()(criteria as any)).toBe('Measure fn Sensor Air');
            });
        });

        describe('field options after a selection', () => {
            it('shows the waiting state, then sets options and keeps only the fields of selected sources on the next tick', fakeAsync(() => {
                const kept = field({ instanceId: EXPORT_ID, exportName: 'Exp1', valueName: 'temp' });
                const dropped = field({ instanceId: 'other', exportName: 'Other', valueName: 'temp' });
                create({ fields: [kept, dropped] });
                const emitted = spyOn(component.updatedDataSourceConfig, 'emit');

                sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);

                expect(component.waitingForDataSourceChange).toBeFalse();
                expect(component.fieldOptionsTMP).toEqual([jasmine.objectContaining({ valueName: 'temp', group: 'Exp1' })]);
                // fields and the options control are only written on the next tick
                expect((component.form.controls.fieldOptions.value as Map<string, unknown>).has('Exp1')).toBeFalse();
                expect(component.form.controls.fields.value).toEqual([kept, dropped]);

                tick();

                expect((component.form.controls.fieldOptions.value as Map<string, unknown>).has('Exp1')).toBeTrue();
                expect(component.form.controls.fields.value).toEqual([kept]);
                const last = emitted.calls.mostRecent().args[0] as DataSourceConfig;
                expect(last.fields).toEqual([kept]);
                expect(last.fieldOptions).toBe(component.form.controls.fieldOptions.value as any);
            }));

            it('stays waiting until the options arrive', fakeAsync(() => {
                create();
                const deviceType$ = new Subject<any>();
                deviceTypeService.getDeviceType.and.returnValue(deviceType$);
                sourceControl(DEVICES).controls.sourceExports.setValue([DEVICE_ID]);

                expect(component.waitingForDataSourceChange).toBeTrue();
                deviceType$.next(deviceType());
                deviceType$.complete();
                tick();

                expect(component.waitingForDataSourceChange).toBeFalse();
            }));

            it('resets the waiting state when loading the options fails', fakeAsync(() => {
                create();
                spyOn(console, 'log');
                deviceTypeService.getDeviceType.and.returnValue(throwError(() => new Error('boom')));

                sourceControl(DEVICES).controls.sourceExports.setValue([DEVICE_ID]);
                tick();

                expect(component.waitingForDataSourceChange).toBeFalse();
            }));

            it('filterSelectedFields matches export, device and device group fields by their source', () => {
                create();
                component.form.controls.fields.setValue([
                    field({ instanceId: 'i', exportName: 'E', valueName: 'a' }),
                    field({ instanceId: 'i', exportName: 'Wrong name', valueName: 'b' }),
                    field({ deviceId: 'dev', valueName: 'c' }),
                    field({ deviceGroupId: 'grp', valueName: 'd' }),
                    field({ deviceId: 'unselected', valueName: 'e' }),
                ]);

                const kept = component.filterSelectedFields([
                    { id: 'i', name: 'E' } as any, { id: 'dev', name: 'x' } as any, { id: 'grp', name: 'y' } as any,
                ]);

                expect(kept.map(f => f.valueName)).toEqual(['a', 'c', 'd']);
            });

            it('filterSelectedFields returns copies, not the form objects', () => {
                create();
                const original = field({ deviceId: 'dev' });
                component.form.controls.fields.setValue([original]);

                const kept = component.filterSelectedFields([{ id: 'dev' } as any]);

                expect(kept[0]).toEqual(original);
                expect(kept[0]).not.toBe(original);
            });
        });

        describe('field options per source type', () => {
            const optionsOf = (selected: any[]) => {
                let result: Map<string, ChartsExportVAxesModel[]> | undefined;
                component.loadFieldOptions(selected).subscribe(r => result = r);
                return result!;
            };

            it('maps an export value to a field of the export', () => {
                create();

                expect(optionsOf([{ id: EXPORT_ID, name: 'Exp1', values: exportModel().Values }]).get('Exp1')).toEqual([{
                    instanceId: EXPORT_ID, exportName: 'Exp1', valueName: 'temp', valueType: FLOAT,
                    color: '', math: '', displayOnSecondVAxis: false, tagSelection: [],
                }]);
            });

            it('maps every output path of a device, named by service and path', () => {
                create();

                const options = optionsOf([device()]);

                expect(options.get('Dev1')).toEqual([{
                    exportName: 'Dev1', valueName: 'svc: temp', valuePath: 'temp', serviceId: 's1', deviceId: DEVICE_ID,
                    valueType: 'float', color: '', math: '', displayOnSecondVAxis: false, tagSelection: [],
                }]);
            });

            it('translates the schema types of device fields and gives an empty type for unknown ones', () => {
                create();
                spyOn(console, 'error');
                const types: [string, string][] = [
                    ['https://schema.org/Text', 'string'], [FLOAT, 'float'], ['https://schema.org/Integer', 'int'],
                    ['https://schema.org/Boolean', 'bool'], ['https://schema.org/ItemList', 'string_json'],
                    ['https://schema.org/StructuredValue', 'string_json'], ['unknown', ''],
                ];
                for (const [type, expected] of types) {
                    deviceTypeService.getValuePathsAndTypes.and.returnValue([{ path: 'p', type }]);
                    expect(optionsOf([device()]).get('Dev1')![0].valueType).withContext(type).toBe(expected);
                }
            });

            it('loads a device type once and reuses it', () => {
                create();

                optionsOf([device()]);
                optionsOf([device()]);

                expect(deviceTypeService.getDeviceType).toHaveBeenCalledOnceWith('dt1');
            });

            it('gives an empty field list for a device whose type is unknown', () => {
                create();
                deviceTypeService.getDeviceType.and.returnValue(of(null));

                expect(optionsOf([device()]).get('Dev1')).toEqual([]);
            });

            it('maps a device group criterion through its function concept', () => {
                create();
                conceptsService.getConceptWithCharacteristics.calls.reset();

                const options = optionsOf([group()]);

                expect(options.get('Group1')).toEqual([{
                    exportName: 'Group1', valueName: 'Measure fn  ', criteria: group().criteria[0] as any, deviceGroupId: GROUP_ID,
                    valueType: 'float', color: '', math: '', displayOnSecondVAxis: false, tagSelection: [],
                }]);
                expect(conceptsService.getConceptWithCharacteristics).toHaveBeenCalledOnceWith('c1');
            });

            it('loads a concept once across loads', () => {
                create();
                conceptsService.getConceptWithCharacteristics.calls.reset();

                optionsOf([group()]);
                optionsOf([group()]);

                expect(conceptsService.getConceptWithCharacteristics).toHaveBeenCalledTimes(1);
            });

            it('skips criteria whose function is unknown', () => {
                create();
                const twoCriteria = group(GROUP_ID, {
                    criteria: [
                        { function_id: 'f1', aspect_id: 'a1', device_class_id: '', interaction: '' },
                        { function_id: 'f1', aspect_id: 'a2', device_class_id: '', interaction: '' },
                        { function_id: 'unknown', aspect_id: 'a3', device_class_id: '', interaction: '' },
                    ],
                });

                const fields = optionsOf([twoCriteria]).get('Group1')!;

                expect(fields.length).toBe(2);
            });

            it('leaves out a group without usable criteria', () => {
                create();

                expect(optionsOf([group(GROUP_ID, { criteria: [] })]).size).toBe(0);
            });

            it('combines the devices and groups of a location, retargeted at the location', () => {
                create();
                const loc = location(LOCATION_ID, { device_ids: [DEVICE_ID], device_group_ids: [GROUP_ID] });

                const fields = optionsOf([loc]).get('Loc1')!;

                expect(fields.length).toBe(2);
                expect(fields.every(f => f.exportName === 'Loc1' && f.locationId === LOCATION_ID)).toBeTrue();
                const deviceField = fields.find(f => f.valueName === 'svc: temp')!;
                expect(deviceField.criteria).toEqual({ aspect_id: 'asp1', device_class_id: 'dc1', function_id: 'fn1', interaction: 'event' });
                expect(deviceField.deviceId).toBeUndefined();
                expect(deviceField.serviceId).toBeUndefined();
                expect(deviceField.valuePath).toBeUndefined();
                const groupField = fields.find(f => f.valueName === 'Measure fn  ')!;
                expect(groupField.deviceGroupId).toBeUndefined();
                expect(groupField.criteria).toEqual(group().criteria[0] as any);
            });

            it('names the aspect of a location device field after the smallest of several aspects', () => {
                create();
                const dt = deviceType();
                (dt.services[0].outputs[0].content_variable.sub_content_variables[0] as any) = { name: 'temp', aspect_ids: ['b', 'a'], function_id: 'fn1' };
                deviceTypeService.getDeviceType.and.returnValue(of(dt as any));

                const fields = optionsOf([location(LOCATION_ID, { device_ids: [DEVICE_ID] })]).get('Loc1')!;

                expect(fields[0].criteria?.aspect_id).toBe('a');
            });

            it('leaves out a location whose devices yield no fields', () => {
                create();
                deviceTypeService.getValuePathsAndTypes.and.returnValue([]);

                expect(optionsOf([location(LOCATION_ID, { device_ids: [DEVICE_ID] })]).size).toBe(0);
            });

            it('emits empty options for a location without devices and groups, so the loading finishes', () => {
                create();
                const emitted = jasmine.createSpy('emitted');

                component.loadFieldOptions([location() as any]).subscribe({ next: emitted });

                expect(emitted).toHaveBeenCalledOnceWith(new Map());
            });

            it('logs and rethrows when loading fails', () => {
                create();
                const log = spyOn(console, 'log');
                deviceTypeService.getDeviceType.and.returnValue(throwError(() => new Error('boom')));
                let error: unknown;

                component.loadFieldOptions([device() as any]).subscribe({ error: e => error = e });

                expect(error).toEqual(new Error('boom'));
                expect(log).toHaveBeenCalledWith('could not load field options');
            });
        });

        describe('loading and merging source options', () => {
            it('getExports keeps the selected exports first on a first page and appends on later pages', () => {
                create({ exports: [exportOption(EXPORT_ID, 'Selected') as any] });
                sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);
                exportService.getExports.and.returnValue(of({ instances: [exportModel('urn:infai:ses:export:e2', 'Second')] } as any));

                component.getExports({ limit: 30, offset: 0 }).subscribe();
                expect(component.getExportOptions('Exports').map(o => o.id)).toEqual([EXPORT_ID, 'urn:infai:ses:export:e2']);

                exportService.getExports.and.returnValue(of({ instances: [exportModel('urn:infai:ses:export:e3', 'Third')] } as any));
                component.getExports({ limit: 20, offset: 30 }).subscribe();
                expect(component.getExportOptions('Exports').map(o => o.id)).toEqual([EXPORT_ID, 'urn:infai:ses:export:e2', 'urn:infai:ses:export:e3']);
            });

            it('getExports refreshes name and values of the exports in the config in place', () => {
                const configured = { id: EXPORT_ID, name: 'Old', values: [], display_name: undefined } as any;
                create({ exports: [configured] });
                exportService.getExports.and.returnValue(of({ instances: [exportModel(EXPORT_ID, 'Renamed')] } as any));

                component.getExports({ limit: 30, offset: 0 }).subscribe();

                expect(configured.name).toBe('Renamed');
                expect(configured.values).toEqual(exportModel().Values as any);
                // the display name was set from the old name when the export was first offered and is not refreshed
                expect(configured.display_name).toBe('Old');
            });

            it('getExports keeps an existing display name of a configured export', () => {
                const configured = { id: EXPORT_ID, name: 'Old', values: [], display_name: 'Mine' } as any;
                create({ exports: [configured] });

                component.getExports({ limit: 30, offset: 0 }).subscribe();

                expect(configured.display_name).toBe('Mine');
            });

            it('getExports skips exports without id or name', () => {
                create();
                exportService.getExports.and.returnValue(of({ instances: [{ Name: 'no id' }, { ID: 'no-name' }, exportModel()] } as any));

                component.getExports({ limit: 30, offset: 0 }).subscribe();

                expect(component.getExportOptions('Exports').map(o => o.id)).toEqual([EXPORT_ID]);
            });

            it('getExports logs and rethrows errors', () => {
                create();
                const log = spyOn(console, 'log');
                exportService.getExports.and.returnValue(throwError(() => new Error('boom')));
                let error: unknown;

                component.getExports({ limit: 30, offset: 0 }).subscribe({ error: e => error = e });

                expect(error).toEqual(new Error('boom'));
                expect(log).toHaveBeenCalledWith('could not get exports');
            });

            it('getDevices replaces the list on offset 0 and appends otherwise, passing the search text', () => {
                create();
                deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device('urn:infai:ses:device:x')], total: 2 } as any));

                component.getDevices({ limit: 30, offset: 0, searchText: 'x' }).subscribe();
                expect(component.getExportOptions('Devices').map(o => o.id)).toEqual(['urn:infai:ses:device:x']);
                expect(deviceInstancesService.getDeviceInstances).toHaveBeenCalledWith({ limit: 30, offset: 0, searchText: 'x' });

                deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device('urn:infai:ses:device:y')], total: 2 } as any));
                component.getDevices({ limit: 20, offset: 30 }).subscribe();
                expect(component.getExportOptions('Devices').map(o => o.id)).toEqual(['urn:infai:ses:device:x', 'urn:infai:ses:device:y']);
            });

            it('getDevices keeps the selected devices at the front of a first page', () => {
                create({ exports: [device() as any] });
                deviceInstancesService.getDeviceInstances.and.returnValue(of({ result: [device('urn:infai:ses:device:z')], total: 1 } as any));

                component.getDevices({ limit: 30, offset: 0 }).subscribe();

                expect(component.getExportOptions('Devices').map(o => o.id)).toEqual([DEVICE_ID, 'urn:infai:ses:device:z']);
            });

            it('getDeviceGroups keeps one single-aspect criterion per aspect and function and clears interaction and class', () => {
                create();
                deviceGroupsService.getDeviceGroups.and.returnValue(of({
                    result: [group(GROUP_ID, {
                        criteria: [
                            { function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc1', interaction: 'event' },
                            { function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc2', interaction: 'request' },
                            { function_id: 'f1', aspect_id: 'a1', aspect_ids: ['a1', 'a2'], device_class_id: '', interaction: '' },
                            { function_id: 'f2', aspect_id: 'a1', device_class_id: '', interaction: '' },
                        ],
                    })],
                    total: 1,
                } as any));

                component.getDeviceGroups({ limit: 30, offset: 0, search: 'g' }).subscribe();

                const loaded = component.getExportOptions('Device Groups')[0] as any;
                expect(loaded.criteria).toEqual([
                    { function_id: 'f1', aspect_id: 'a1', device_class_id: '', interaction: '' },
                    { function_id: 'f2', aspect_id: 'a1', device_class_id: '', interaction: '' },
                ]);
                expect(deviceGroupsService.getDeviceGroups).toHaveBeenCalledWith('g', 30, 0, 'name', 'asc', false);
            });

            it('getDeviceGroups gives a group without criteria an empty list', () => {
                create();
                deviceGroupsService.getDeviceGroups.and.returnValue(of({ result: [{ id: GROUP_ID, name: 'Bare' }], total: 1 } as any));

                component.getDeviceGroups({ limit: 30, offset: 0 }).subscribe();

                expect((component.getExportOptions('Device Groups')[0] as any).criteria).toEqual([]);
            });

            it('getLocations loads and merges like the others', () => {
                create({ exports: [location() as any] }, { showLocationsAsSource: true });
                locationsService.getLocations.and.returnValue(of({ result: [location('urn:infai:ses:location:l2', { name: 'Two' })], total: 2 } as any));

                component.getLocations({ limit: 30, offset: 0, search: 's' }).subscribe();

                expect(component.getExportOptions('Locations').map(o => o.id)).toEqual([LOCATION_ID, 'urn:infai:ses:location:l2']);
                expect(locationsService.getLocations).toHaveBeenCalledWith({ limit: 30, offset: 0, search: 's' });
            });

            it('loadDataSourceOptions dispatches by class and rejects an unknown one', () => {
                create();
                let error: unknown;
                component.loadDataSourceOptions('Nope', 30, 0).subscribe({ error: e => error = e });

                expect(error).toEqual(new Error('No valid DataSourceClass'));
            });
        });

        describe('scrolling, search and close', () => {
            const manyDevices = () => deviceInstancesService.getDeviceInstances.and.callFake(((req: { limit: number; offset: number }) =>
                of({ result: devicesRange(req.offset, Math.min(req.offset + req.limit, 80)), total: 80 })) as any);
            const deviceCalls = () => deviceInstancesService.getDeviceInstances.calls.allArgs().map(a => [a[0].limit, a[0].offset, a[0].searchText]);

            it('loads the next 20 once the scroll reaches the last 20 loaded items', () => {
                manyDevices();
                create();
                deviceInstancesService.getDeviceInstances.calls.reset();

                component.onSelectScroll({ start: 0, end: 5 }, sourceControl(DEVICES));
                expect(deviceCalls()).toEqual([]);

                component.onSelectScroll({ start: 15, end: 25 }, sourceControl(DEVICES));

                expect(deviceCalls()).toEqual([[20, 30, '']]);
                expect(component.getExportOptions('Devices').length).toBe(50);
                expect(sourceControl(DEVICES).getRawValue()).toEqual(jasmine.objectContaining({ lastScrollStart: 15, lastScrollEnd: 25 }));
                expect(component.loadingDataSource).toBeFalse();
            });

            it('ignores a repeated scroll position and scrolls while a load is running', () => {
                manyDevices();
                create();
                const pending = new Subject<any>();
                deviceInstancesService.getDeviceInstances.calls.reset();
                deviceInstancesService.getDeviceInstances.and.returnValue(pending);

                component.onSelectScroll({ start: 15, end: 25 }, sourceControl(DEVICES));
                expect(component.loadingDataSource).toBeTrue();
                component.onSelectScroll({ start: 16, end: 26 }, sourceControl(DEVICES));
                expect(deviceInstancesService.getDeviceInstances).toHaveBeenCalledTimes(1);

                pending.next({ result: [], total: 0 });
                expect(component.loadingDataSource).toBeFalse();
                component.onSelectScroll({ start: 15, end: 25 }, sourceControl(DEVICES));
                expect(deviceInstancesService.getDeviceInstances).toHaveBeenCalledTimes(1);
            });

            it('resets the loading flag when loading more fails', () => {
                create();
                spyOn(console, 'log');
                deviceInstancesService.getDeviceInstances.and.returnValue(throwError(() => new Error('boom')));

                component.onSelectScrollEnd(sourceControl(DEVICES));

                expect(component.loadingDataSource).toBeFalse();
            });

            it('onSelectScrollEnd loads the next batch behind the loaded items with the last search term', () => {
                manyDevices();
                create();
                sourceControl(DEVICES).patchValue({ lastSearch: 'abc' });
                deviceInstancesService.getDeviceInstances.calls.reset();

                component.onSelectScrollEnd(sourceControl(DEVICES));

                expect(deviceCalls()).toEqual([[20, 30, 'abc']]);
                expect(sourceControl(DEVICES).getRawValue()).toEqual(jasmine.objectContaining({ lastScrollStart: 30, lastScrollEnd: 50 }));
            });

            it('searches after a 250 ms pause with only the last term and resets the scroll state', fakeAsync(() => {
                manyDevices();
                create();
                deviceInstancesService.getDeviceInstances.calls.reset();

                component.onSelectSearch({ term: 'a', items: [] }, sourceControl(DEVICES));
                tick(100);
                component.onSelectSearch({ term: 'ab', items: [] }, sourceControl(DEVICES));
                tick(249);
                expect(deviceCalls()).toEqual([]);
                tick(1);

                expect(deviceCalls()).toEqual([[30, 0, 'ab']]);
                expect(sourceControl(DEVICES).getRawValue()).toEqual(jasmine.objectContaining({
                    lastScrollStart: 0, lastScrollEnd: 10, lastSearch: 'ab', lastOffset: 0,
                }));
            }));

            it('reloads the first page without a search term when the select closes', () => {
                manyDevices();
                create();
                sourceControl(DEVICES).patchValue({ lastSearch: 'abc' });
                deviceInstancesService.getDeviceInstances.calls.reset();

                component.onSelectClose(sourceControl(DEVICES));

                expect(deviceCalls()).toEqual([[30, 0, '']]);
                expect(sourceControl(DEVICES).getRawValue()).toEqual(jasmine.objectContaining({ lastSearch: '', lastScrollEnd: 10 }));
            });

            it('keeps the selected devices at the front when the first page is reloaded', () => {
                manyDevices();
                create({ exports: [device('urn:infai:ses:device:99') as any] });

                component.onSelectClose(sourceControl(DEVICES));

                const ids = component.getExportOptions('Devices').map(o => o.id);
                expect(ids[0]).toBe('urn:infai:ses:device:99');
                expect(ids.length).toBe(31);
            });
        });

        describe('error message', () => {
            it('shows no error before the user touched a chosen source', () => {
                create();
                component.form.controls.dataSourceClasses.setValue(['Exports']);

                sourceControl(EXPORTS).controls.sourceExports.setValue([]);

                expect(component.showDataSourceError).toBeFalse();
            });

            it('shows the error once a chosen source was touched and nothing is selected', () => {
                create();
                component.form.controls.dataSourceClasses.setValue(['Exports']);
                sourceControl(EXPORTS).controls.sourceExports.markAsTouched();

                expect(component.showDataSourceError).toBeTrue();
            });

            it('hides the error as soon as an export is selected', () => {
                create();
                component.form.controls.dataSourceClasses.setValue(['Exports']);
                sourceControl(EXPORTS).controls.sourceExports.markAsTouched();

                sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);

                expect(component.showDataSourceError).toBeFalse();
            });
        });

        describe('aggregation types', () => {
            const values = () => component.groupTypes.map((g: { value: string }) => g.value);

            it('offers 16 aggregations and the time weighted ones only without an internal influx export', () => {
                create({ exports: [device() as any] });

                expect(values().length).toBe(18);
                expect(values().slice(0, 3)).toEqual(['mean', 'sum', 'count']);
                expect(values().slice(-2)).toEqual(['time-weighted-mean-linear', 'time-weighted-mean-locf']);
            });

            it('leaves out the time weighted ones when an export of the influx database is selected', () => {
                create({ exports: [exportOption(EXPORT_ID, 'E') as any, exportOption('urn:infai:ses:export:e9', 'E9', { exportDatabaseId: environment.exportDatabaseIdInternalInfluxDb }) as any] });

                expect(values().length).toBe(16);
                expect(values()).not.toContain('time-weighted-mean-linear');
            });

            it('treats an export without a database or a group without criteria as influx', () => {
                create({ exports: [{ id: EXPORT_ID, name: 'E', values: [] } as any] });

                expect(values().length).toBe(16);
            });
        });

        describe('compareFields', () => {
            it('matches fields of the same export value, device path, group function or location function', () => {
                create();
                const c = component.compareFields;

                expect(c(field({ instanceId: 'i', exportName: 'e', valueName: 'v', color: 'red' }), field({ instanceId: 'i', exportName: 'e', valueName: 'v' }))).toBeTrue();
                expect(c(field({ instanceId: 'i', exportName: 'e', valueName: 'v' }), field({ instanceId: 'i', exportName: 'e', valueName: 'w' }))).toBeFalse();
                expect(c(field({ deviceId: 'd', serviceId: 's', valuePath: 'p' }), field({ deviceId: 'd', serviceId: 's', valuePath: 'p' }))).toBeTrue();
                expect(c(field({ deviceId: 'd', serviceId: 's', valuePath: 'p' }), field({ deviceId: 'd', serviceId: 's2', valuePath: 'p' }))).toBeFalse();
                const crit = (fn: string) => ({ function_id: fn } as any);
                expect(c(field({ deviceGroupId: 'g', criteria: crit('f') }), field({ deviceGroupId: 'g', criteria: crit('f') }))).toBeTrue();
                expect(c(field({ deviceGroupId: 'g', criteria: crit('f') }), field({ deviceGroupId: 'g', criteria: crit('x') }))).toBeFalse();
                expect(c(field({ locationId: 'l', criteria: crit('f') }), field({ locationId: 'l', criteria: crit('f') }))).toBeTrue();
                expect(c(field({ locationId: 'l', criteria: crit('f') }), field({ deviceGroupId: 'l', criteria: crit('f') }))).toBeFalse();
            });
        });
    });

    describe('template', () => {
        beforeEach(() => configure(null));

        const spinners = () => fixture.nativeElement.querySelectorAll('mat-spinner').length;
        const headings = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('h2')).map(h => h.textContent!.trim());

        it('shows only a spinner until the sources are loaded', () => {
            const functions = new Subject<any>();
            functionsService.getFunctions.and.returnValue(functions);
            create();

            expect(spinners()).toBe(1);
            expect(fixture.nativeElement.querySelector('form')).toBeNull();

            functions.next({ result: [], total: 0 });
            functions.complete();
            fixture.detectChanges();

            expect(spinners()).toBe(0);
            expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
        });

        it('shows all four sections by default', () => {
            create();

            expect(headings()).toEqual(['Select the Data Sources', 'Select the Exported Fields', 'Choose a Time Range', 'Choose an Aggregation']);
        });

        it('hides each section when its input is off', () => {
            create(undefined, { showSource: false, showTimeRange: false, enableAggretationConfig: false, enableFieldSelection: false });

            expect(headings()).toEqual([]);
        });

        it('hides the field section while no source is selected and shows it afterwards', () => {
            create();
            const fieldsHeading = () => fixture.nativeElement.querySelector('span[hidden]');
            expect(fieldsHeading()).not.toBeNull();

            sourceControl(EXPORTS).controls.sourceExports.setValue([EXPORT_ID]);
            fixture.detectChanges();

            expect(fieldsHeading()).toBeNull();
        });

        it('replaces the form body by a spinner while field options load, and shows it again afterwards', fakeAsync(() => {
            create();
            const deviceType$ = new Subject<any>();
            deviceTypeService.getDeviceType.and.returnValue(deviceType$);

            sourceControl(DEVICES).controls.sourceExports.setValue([DEVICE_ID]);
            fixture.detectChanges();
            expect(spinners()).toBe(1);
            expect(headings()).toEqual(['Select the Data Sources']);

            deviceType$.next(deviceType());
            deviceType$.complete();
            tick();
            fixture.detectChanges();

            expect(spinners()).toBe(0);
            expect(headings().length).toBe(4);
        }));

        it('shows the data source error only when set', () => {
            create();
            expect(fixture.nativeElement.querySelector('mat-error.error')).toBeNull();

            component.showDataSourceError = true;
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('mat-error.error')?.textContent).toContain('Please select at least one data source!');
        });

        it('shows time and interval inputs for a relative time range and start and end for an absolute one', () => {
            create({ timeRange: { type: ChartsExportRangeTimeTypeEnum.Relative } });
            const inputs = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('input[formControlName]')).map(i => i.getAttribute('formControlName'));
            expect(inputs()).toContain('time');
            expect(inputs()).not.toContain('start');

            component.form.get('timeRange.type')!.setValue(ChartsExportRangeTimeTypeEnum.Absolute);
            fixture.detectChanges();

            expect(inputs()).toContain('start');
            expect(inputs()).toContain('end');
        });

        it('hides the exports select of a class that is not chosen visually but keeps it in the DOM', () => {
            create();
            component.form.controls.dataSourceClasses.setValue(['Exports']);
            fixture.detectChanges();

            const fields = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-form-field'));
            const hiddenOf = (label: string) => fields.find(f => f.querySelector('mat-label')?.textContent?.trim() === label)!.classList.contains('cdk-visually-hidden');
            expect(['Devices', 'Device Groups', 'Exports', 'Locations'].map(hiddenOf)).toEqual([true, true, false, true]);
        });
    });
});
