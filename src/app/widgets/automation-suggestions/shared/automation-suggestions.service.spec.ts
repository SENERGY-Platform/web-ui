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

import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { ProcessIoService } from 'src/app/modules/processes/process-io/shared/process-io.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { describeError } from './automation-suggestion.format';
import { acceptVariables, ResolvedSuggestion, resolveSuggestion } from './automation-suggestion.resolver';
import {
    catalogFixture,
    lampDeviceId,
    plugDeviceId,
    plugType,
    suggestionFixture
} from './automation-suggestion.fixtures';
import { ActiveAutomation, AutomationSuggestionsService, AutomationSuggestionsView } from './automation-suggestions.service';

/** The open suggestions of a view, in the order of the export. */
const openOf = (view: AutomationSuggestionsView): ResolvedSuggestion[] =>
    view.items.flatMap((item) => (item.kind === 'open' ? [item.resolved] : []));

/** The accepted automations of a view, in the order of the export. */
const acceptedOf = (view: AutomationSuggestionsView): ActiveAutomation[] =>
    view.items.flatMap((item) => (item.kind === 'accepted' ? [item.automation] : []));

describe('AutomationSuggestionsService', () => {
    let service: AutomationSuggestionsService;
    let http: HttpTestingController;
    let exportData: jasmine.SpyObj<ExportDataService>;
    let processIo: jasmine.SpyObj<ProcessIoService>;
    let deviceInstances: jasmine.SpyObj<DeviceInstancesService>;
    let deviceTypes: jasmine.SpyObj<DeviceTypeService>;
    let functions: jasmine.SpyObj<FunctionsService>;
    const modulesUrl = environment.automationEngineUrl + '/namespaces/smart-services/modules';

    beforeEach(() => {
        exportData = jasmine.createSpyObj<ExportDataService>('ExportDataService', ['getLastValuesTimescale']);
        processIo = jasmine.createSpyObj<ProcessIoService>('ProcessIoService', ['listVariables', 'set', 'remove']);
        deviceInstances = jasmine.createSpyObj<DeviceInstancesService>('DeviceInstancesService', ['getDeviceListByIds']);
        deviceTypes = jasmine.createSpyObj<DeviceTypeService>('DeviceTypeService', ['getDeviceTypeListByIds', 'getFunctionsByIds', 'getValuePathsAndContentVariables']);
        functions = jasmine.createSpyObj<FunctionsService>('FunctionsService', ['getFunctionsByConceptIds']);
        processIo.listVariables.and.returnValue(of([]));
        deviceTypes.getValuePathsAndContentVariables.and.callFake(() => []);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: DashboardService, useValue: { manipulateWidget: () => {} } },
                { provide: ExportDataService, useValue: exportData },
                { provide: ProcessIoService, useValue: processIo },
                { provide: DeviceInstancesService, useValue: deviceInstances },
                { provide: DeviceTypeService, useValue: deviceTypes },
                { provide: FunctionsService, useValue: functions },
            ],
        });
        service = TestBed.inject(AutomationSuggestionsService);
        http = TestBed.inject(HttpTestingController);
    });

    it('starts accept_suggestion with the variables of the resolved suggestion', () => {
        const resolved = resolveSuggestion(suggestionFixture({ auto_off_s: 120 }), catalogFixture())!;
        let status: number | undefined;
        service.accept('inst-1', resolved, 120).subscribe((r) => (status = r.status));

        const req = http.expectOne(environment.automationEngineUrl + '/namespaces/smart-services/instances/inst-1/maintenance-procedures/accept_suggestion/start');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ variables: acceptVariables(resolved, 120) });
        req.flush({}, { status: 201, statusText: 'Created' });
        expect(status).toBe(201);
        http.verify();
    });

    it('removes a module by its id', () => {
        let status: number | undefined;
        service.removeAutomation('mod-7').subscribe((r) => (status = r.status));
        const req = http.expectOne(modulesUrl + '/mod-7');
        expect(req.request.method).toBe('DELETE');
        req.flush('', { status: 204, statusText: 'No Content' });
        expect(status).toBe(204);
        http.verify();
    });

    it('passes a 403 of the module list to the caller so it can be shown', () => {
        let error: unknown;
        service.loadView('inst-1').subscribe({ error: (e: unknown) => (error = e) });
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'export')
            .flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
        expect(error).toEqual(jasmine.any(HttpErrorResponse));
        expect(describeError(error, 'fallback')).toContain('403');
        http.match(() => true);
    });

    it('builds the view from the export, the active modules and the device repository', () => {
        let view: AutomationSuggestionsView | undefined;
        service.loadView('inst-1').subscribe((v) => (view = v));

        const suggestionDocument = JSON.stringify({ version: 'v', trained_at: 't', history: {}, suggestions: [
            suggestionFixture(),
            suggestionFixture({ id: 'sug-old' }),
        ] });
        exportData.getLastValuesTimescale.and.returnValue(of([{ time: null, value: suggestionDocument }]));
        deviceInstances.getDeviceListByIds.and.returnValue(of([
            { id: plugDeviceId, device_type_id: 'type-plug', name: 'plug', display_name: 'Plug Stehlampe' },
            { id: lampDeviceId, device_type_id: 'type-plug', name: 'lamp', display_name: 'Licht EG' },
        ] as never[]));
        deviceTypes.getDeviceTypeListByIds.and.returnValue(of([plugType()]));

        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'export').flush({
            items: [{ id: 'exp-mod', instance_id: 'inst-1', module_type: 'export', module_data: { export: { ID: 'export-1' } } }],
            total: 1, limit: 100, offset: 0,
        });
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'process_deployment').flush({
            items: [{
                id: 'mod-accepted', instance_id: 'inst-1', module_type: 'process_deployment', keys: ['suggestion:sug-old'],
                module_data: { process_deployment_name: 'Old automation' },
            }],
            total: 1, limit: 100, offset: 0,
        });

        expect(view).toBeDefined();
        expect(view!.exportMissing).toBeFalse();
        expect(exportData.getLastValuesTimescale).toHaveBeenCalledWith([{ exportId: 'export-1', columnName: 'suggestions' }]);
        expect(openOf(view!).map((s) => s.label)).toEqual(['Plug Stehlampe off → Licht EG on']);
        // the accepted suggestion is still in the export: its label comes from the resolved suggestion and it is not offered again
        expect(acceptedOf(view!).map((a) => ({ moduleId: a.moduleId, suggestionId: a.suggestionId, label: a.label, autoOffS: a.autoOffS })))
            .toEqual([{ moduleId: 'mod-accepted', suggestionId: 'sug-old', label: 'Plug Stehlampe off → Licht EG on', autoOffS: undefined }]);
        expect(acceptedOf(view!)[0].suggestion?.suggestion.id).toBe('sug-old');
        expect(openOf(view!).length).toBe(1);
        expect(view!.dismissed).toEqual([]);
    });

    /** Flushes the export and the module listings of one instance and returns the view. */
    const loadWith = (suggestions: object[], modules: object[], dismissed: string[] = []): AutomationSuggestionsView | undefined => {
        // the spies are read when the view starts loading, so they are set first
        exportData.getLastValuesTimescale.and.returnValue(of([{ time: null, value: JSON.stringify({ suggestions }) }]));
        processIo.listVariables.and.returnValue(of(dismissed.map((id) => ({ key: 'automation-suggester.dismissed.' + id })) as never));
        deviceInstances.getDeviceListByIds.and.returnValue(of([
            { id: plugDeviceId, device_type_id: 'type-plug', name: 'plug', display_name: 'Plug Stehlampe' },
            { id: lampDeviceId, device_type_id: 'type-plug', name: 'lamp', display_name: 'Licht EG' },
        ] as never[]));
        deviceTypes.getDeviceTypeListByIds.and.returnValue(of([plugType()]));
        let view: AutomationSuggestionsView | undefined;
        service.loadView('inst-1').subscribe((v) => (view = v));
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'export').flush({
            items: [{ id: 'exp-mod', instance_id: 'inst-1', module_type: 'export', module_data: { export: { ID: 'export-1' } } }],
            total: 1, limit: 100, offset: 0,
        });
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'process_deployment').flush({
            items: modules, total: modules.length, limit: 100, offset: 0,
        });
        return view;
    };

    it('reads the switch-off delay of each module: a number, null, or unknown when the field is missing', () => {
        const view = loadWith([suggestionFixture({ id: 'a' }), suggestionFixture({ id: 'b' }), suggestionFixture({ id: 'c' })], [
            { id: 'm-a', instance_id: 'inst-1', keys: ['suggestion:a'], module_data: { process_deployment_name: 'A', auto_off_s: 120 } },
            { id: 'm-b', instance_id: 'inst-1', keys: ['suggestion:b'], module_data: { process_deployment_name: 'B', auto_off_s: null } },
            { id: 'm-c', instance_id: 'inst-1', keys: ['suggestion:c'], module_data: { process_deployment_name: 'C' } },
        ]);

        expect(acceptedOf(view!).map((a) => a.autoOffS)).toEqual([120, null, undefined]);
    });

    it('lists a dismissed suggestion apart from the open ones and hides it while it is accepted', () => {
        const view = loadWith([suggestionFixture({ id: 'sug-1' }), suggestionFixture({ id: 'sug-old' })], [], ['sug-old']);

        expect(openOf(view!).map((s) => s.suggestion.id)).toEqual(['sug-1']);
        expect(view!.dismissed.map((s) => s.suggestion.id)).toEqual(['sug-old']);
        expect(view!.dismissed[0].label).toBe('Plug Stehlampe off → Licht EG on');
    });

    it('does not list a dismissed suggestion that is accepted', () => {
        const view = loadWith([suggestionFixture({ id: 'sug-old' })], [
            { id: 'm-old', instance_id: 'inst-1', keys: ['suggestion:sug-old'], module_data: { process_deployment_name: 'Old' } },
        ], ['sug-old']);

        expect(view!.dismissed).toEqual([]);
        expect(openOf(view!)).toEqual([]);
        expect(acceptedOf(view!).map((a) => a.suggestionId)).toEqual(['sug-old']);
    });

    it('restores a dismissed suggestion by removing its process-io variable', () => {
        processIo.remove.and.returnValue(of({ status: 204 }));
        let status: number | undefined;
        service.restore('sug-old').subscribe((r) => (status = r.status));

        expect(processIo.remove).toHaveBeenCalledWith('automation-suggester.dismissed.sug-old');
        expect(status).toBe(204);
    });

    it('fails the restore when process-io does not remove the variable and still holds it', () => {
        processIo.remove.and.returnValue(of({ status: 500 }));
        processIo.listVariables.and.returnValue(of([{ key: 'automation-suggester.dismissed.sug-old' }] as never));
        let error: unknown;
        service.restore('sug-old').subscribe({ error: (e: unknown) => (error = e) });

        expect(error).toEqual(jasmine.any(Error));
    });

    it('counts a restore as done when the variable is already gone', () => {
        processIo.remove.and.returnValue(of({ status: 500 }));
        processIo.listVariables.and.returnValue(of([]));
        let status: number | undefined;
        service.restore('sug-old').subscribe((r) => (status = r.status));

        expect(processIo.listVariables).toHaveBeenCalledWith(1000, 0, '', 'automation-suggester.dismissed.sug-old');
        expect(status).toBe(404);
    });

    it('hides a suggestion whose devices are not in the device repository', () => {
        let view: AutomationSuggestionsView | undefined;
        service.loadView('inst-1').subscribe((v) => (view = v));
        exportData.getLastValuesTimescale.and.returnValue(of([{ time: null, value: JSON.stringify({ suggestions: [suggestionFixture()] }) }]));
        deviceInstances.getDeviceListByIds.and.returnValue(of([]));
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'export').flush({
            items: [{ id: 'exp-mod', instance_id: 'inst-1', module_type: 'export', module_data: { export: { ID: 'export-1' } } }],
            total: 1, limit: 100, offset: 0,
        });
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'process_deployment')
            .flush({ items: [], total: 0, limit: 100, offset: 0 });

        expect(openOf(view!)).toEqual([]);
    });

    it('shows the suggestions when the dismissed listing fails', () => {
        processIo.listVariables.and.returnValue(throwError(() => new Error('process-io down')));
        let view: AutomationSuggestionsView | undefined;
        exportData.getLastValuesTimescale.and.returnValue(of([{ time: null, value: JSON.stringify({ suggestions: [suggestionFixture()] }) }]));
        deviceInstances.getDeviceListByIds.and.returnValue(of([
            { id: plugDeviceId, device_type_id: 'type-plug', name: 'plug', display_name: 'Plug Stehlampe' },
            { id: lampDeviceId, device_type_id: 'type-plug', name: 'lamp', display_name: 'Licht EG' },
        ] as never[]));
        deviceTypes.getDeviceTypeListByIds.and.returnValue(of([plugType()]));
        service.loadView('inst-1').subscribe((v) => (view = v));
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'export').flush({
            items: [{ id: 'exp-mod', instance_id: 'inst-1', module_type: 'export', module_data: { export: { ID: 'export-1' } } }],
            total: 1, limit: 100, offset: 0,
        });
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'process_deployment')
            .flush({ items: [], total: 0, limit: 100, offset: 0 });

        expect(openOf(view!).map((s) => s.label)).toEqual(['Plug Stehlampe off → Licht EG on']);
    });

    it('treats a null listing as nothing dismissed', () => {
        processIo.listVariables.and.returnValue(of(null));
        let view: AutomationSuggestionsView | undefined;
        exportData.getLastValuesTimescale.and.returnValue(of([{ time: null, value: JSON.stringify({ suggestions: [suggestionFixture()] }) }]));
        deviceInstances.getDeviceListByIds.and.returnValue(of([
            { id: plugDeviceId, device_type_id: 'type-plug', name: 'plug', display_name: 'Plug Stehlampe' },
            { id: lampDeviceId, device_type_id: 'type-plug', name: 'lamp', display_name: 'Licht EG' },
        ] as never[]));
        deviceTypes.getDeviceTypeListByIds.and.returnValue(of([plugType()]));
        service.loadView('inst-1').subscribe((v) => (view = v));
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'export').flush({
            items: [{ id: 'exp-mod', instance_id: 'inst-1', module_type: 'export', module_data: { export: { ID: 'export-1' } } }],
            total: 1, limit: 100, offset: 0,
        });
        http.expectOne((r) => r.url === modulesUrl && r.params.get('module_type') === 'process_deployment')
            .flush({ items: [], total: 0, limit: 100, offset: 0 });

        expect(openOf(view!).length).toBe(1);
    });

    it('keeps the order of the export in one list, and puts accepted ones the export no longer lists at the end', () => {
        const view = loadWith([suggestionFixture({ id: 'a' }), suggestionFixture({ id: 'b' }), suggestionFixture({ id: 'c' })], [
            { id: 'm-b', instance_id: 'inst-1', keys: ['suggestion:b'], module_data: { process_deployment_name: 'B' } },
            { id: 'm-x', instance_id: 'inst-1', keys: ['suggestion:x'], module_data: { process_deployment_name: 'Gone' } },
        ]);

        expect(view!.items.map((item) => (item.kind === 'open' ? item.resolved.suggestion.id : item.automation.suggestionId)))
            .toEqual(['a', 'b', 'c', 'x']);
        expect(view!.items.map((item) => item.kind)).toEqual(['open', 'accepted', 'open', 'accepted']);
    });
});
