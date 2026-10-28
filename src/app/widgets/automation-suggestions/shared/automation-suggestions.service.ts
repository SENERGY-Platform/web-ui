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

import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { dialogSize } from 'src/app/core/dialog-size';
import { AutomationEngineService } from 'src/app/core/services/automation-engine.service';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from 'src/app/modules/dashboard/shared/open-widget-edit-dialog';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeFunctionModel,
    DeviceTypeModel
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { ProcessIoService } from 'src/app/modules/processes/process-io/shared/process-io.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { AcceptedAutomationDialogComponent } from '../dialog/accepted-automation/accepted-automation-dialog.component';
import { AutoOffDialogComponent } from '../dialog/auto-off/auto-off-dialog.component';
import { AutomationSuggestionsEditComponent } from '../dialog/edit/edit.component';
import {
    ACCEPT_SUGGESTION_PROCEDURE,
    AUTOMATION_SUGGESTIONS_EXPORT_COLUMN,
    AUTOMATION_SUGGESTIONS_EXPORT_MODULE_TYPE,
    AutoOffChoice,
    CONTROLLING_FUNCTION_RDF_TYPE,
    DISMISSED_SUGGESTION_KEY_PREFIX,
    PROCESS_DEPLOYMENT_MODULE_TYPE,
    SUGGESTION_MODULE_KEY_PREFIX,
    AutomationSuggestion,
    dismissedKeyForSuggestion
} from './automation-suggestion.model';
import { parseSuggestionDocument } from './automation-suggestion.parser';
import {
    AutomationCatalog,
    acceptVariables,
    devicePath,
    measuredFunctionKey,
    ResolvedSuggestion,
    resolveSuggestion
} from './automation-suggestion.resolver';

/** An accepted suggestion: a deployed module of this instance. */
export interface ActiveAutomation {
    moduleId: string;
    suggestionId: string;
    label: string;
    /** the suggestion while it is still in the export and its targets resolve; null otherwise */
    suggestion: ResolvedSuggestion | null;
    /** the switch-off delay stored in the module: null without switch-off, undefined when the module predates the field */
    autoOffS: number | null | undefined;
}

/** One card of the list: an open suggestion, or an accepted one. */
export type ViewItem =
    | { kind: 'open'; resolved: ResolvedSuggestion }
    | { kind: 'accepted'; automation: ActiveAutomation };

/** Everything the widget shows, computed from the export, the modules, process-io and the device repository. */
export interface AutomationSuggestionsView {
    /** true while the instance has no export module yet, e.g. before the first training */
    exportMissing: boolean;
    /** open and accepted suggestions in the order of the export; accepted ones the export no longer lists follow at the end */
    items: ViewItem[];
    /** resolved suggestions the user dismissed and has not accepted, in the order of the export */
    dismissed: ResolvedSuggestion[];
}

interface ActiveModule {
    moduleId: string;
    suggestionId: string;
    moduleName: string;
    autoOffS: number | null | undefined;
}

@Injectable({
    providedIn: 'root',
})
export class AutomationSuggestionsService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private exportDataService = inject(ExportDataService);
    private automationEngineService = inject(AutomationEngineService);
    private processIoService = inject(ProcessIoService);
    private deviceInstancesService = inject(DeviceInstancesService);
    private deviceTypeService = inject(DeviceTypeService);
    private functionsService = inject(FunctionsService);
    private dialogsService = inject(DialogsService);

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, AutomationSuggestionsEditComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        }, dialogSize('m'));
    }

    /** Asks for the switch-off delay of an open suggestion. Closes with the typed text, undefined on cancel. */
    askAutoOffSeconds(seconds: string): Observable<string | undefined> {
        return this.dialog.open<AutoOffDialogComponent, { seconds: string }, string>(AutoOffDialogComponent, {
            data: { seconds },
            ...dialogSize('s'),
        }).afterClosed();
    }

    /** Edits the switch-off of an accepted automation. Closes with the chosen switch and delay, undefined on cancel. */
    editAccepted(choice: AutoOffChoice): Observable<AutoOffChoice | undefined> {
        return this.dialog.open<AcceptedAutomationDialogComponent, AutoOffChoice, AutoOffChoice>(AcceptedAutomationDialogComponent, {
            data: choice,
            ...dialogSize('s'),
        }).afterClosed();
    }

    /** Asks before an accepted automation is removed. Emits true only when the user confirms. */
    confirmRemove(): Observable<boolean> {
        return this.dialogsService.openConfirmDialog(
            'Remove this automation?',
            'The automation stops running. The suggestion is offered again.',
        ).afterClosed().pipe(map((confirmed) => confirmed === true));
    }

    /** Loads the view of one instance. Each source is read once per call. */
    loadView(instanceId: string): Observable<AutomationSuggestionsView> {
        return forkJoin({
            exportId: this.loadExportId(instanceId),
            active: this.loadActive(instanceId),
            dismissed: this.loadDismissed(),
        }).pipe(
            switchMap(({ exportId, active, dismissed }) =>
                this.loadSuggestions(exportId).pipe(
                    switchMap((suggestions) => this.loadCatalog(suggestions).pipe(
                        map((catalog) => this.buildView(exportId === null, suggestions, catalog, active, dismissed)),
                    )),
                ),
            ),
        );
    }

    /**
     * Starts accept_suggestion with the resolved suggestion. autoOffS is the chosen switch-off delay in seconds,
     * null without switch-off. The deployment appears as a module of the instance.
     */
    accept(instanceId: string, resolved: ResolvedSuggestion, autoOffS: number | null): Observable<{ status: number }> {
        return this.automationEngineService.startMaintenanceProcedure(instanceId, ACCEPT_SUGGESTION_PROCEDURE, acceptVariables(resolved, autoOffS));
    }

    removeAutomation(moduleId: string): Observable<{ status: number }> {
        return this.automationEngineService.deleteModule(moduleId);
    }

    /**
     * Shows a dismissed suggestion again by removing its process-io variable. A failed removal counts as done when
     * the variable is gone anyway (e.g. already restored elsewhere); process-io reports every failure as 500.
     */
    restore(suggestionId: string): Observable<{ status: number }> {
        const key = dismissedKeyForSuggestion(suggestionId);
        return this.processIoService.remove(key).pipe(
            switchMap((resp) => resp.status < 300 ? of(resp) : this.processIoService.listVariables(1000, 0, '', key).pipe(
                switchMap((variables) => (variables ?? []).some((v) => v.key === key)
                    ? throwError(() => new Error('restore failed with status ' + resp.status))
                    : of({ status: 404 })),
            )),
        );
    }

    /** Hides a suggestion for this user by writing its process-io variable. */
    /** Hides a suggestion. The variable is bound to the instance, so it is deleted together with the instance. */
    dismiss(suggestionId: string, instanceId: string): Observable<{ status: number }> {
        return this.processIoService.set({
            key: dismissedKeyForSuggestion(suggestionId),
            value: true,
            process_definition_id: '',
            process_instance_id: instanceId,
            unix_timestamp_in_s: Math.floor(Date.now() / 1000),
        }).pipe(
            switchMap((resp) => resp.status >= 300 ? throwError(() => new Error('dismiss failed with status ' + resp.status)) : of(resp)),
        );
    }

    private loadExportId(instanceId: string): Observable<string | null> {
        return this.automationEngineService.listModules({ instanceId, moduleType: AUTOMATION_SUGGESTIONS_EXPORT_MODULE_TYPE }).pipe(
            map((list) => list.items.find((module) => !!module.module_data?.export?.ID)?.module_data.export?.ID ?? null),
        );
    }

    private loadSuggestions(exportId: string | null): Observable<AutomationSuggestion[]> {
        if (exportId === null) {
            return of([]);
        }
        return this.exportDataService.getLastValuesTimescale([{ exportId, columnName: AUTOMATION_SUGGESTIONS_EXPORT_COLUMN }]).pipe(
            map((pairs) => {
                const raw = pairs[0]?.value;
                return parseSuggestionDocument(typeof raw === 'string' ? raw : null);
            }),
        );
    }

    private loadActive(instanceId: string): Observable<ActiveModule[]> {
        return this.automationEngineService.listModules({ instanceId, moduleType: PROCESS_DEPLOYMENT_MODULE_TYPE }).pipe(
            map((list) => list.items.flatMap((module) => (module.keys ?? [])
                .filter((key) => key.startsWith(SUGGESTION_MODULE_KEY_PREFIX))
                .map((key) => ({
                    moduleId: module.id,
                    suggestionId: key.slice(SUGGESTION_MODULE_KEY_PREFIX.length),
                    moduleName: module.module_data?.process_deployment_name ?? key,
                    autoOffS: moduleAutoOffS(module.module_data?.['auto_off_s']),
                })))),
        );
    }

    private loadDismissed(): Observable<Set<string>> {
        // a failed listing counts as nothing dismissed: the suggestions stay visible
        return this.processIoService.listVariables(1000, 0, '', DISMISSED_SUGGESTION_KEY_PREFIX).pipe(
            map((variables) => new Set((variables ?? [])
                .filter((variable) => variable.key.startsWith(DISMISSED_SUGGESTION_KEY_PREFIX))
                .map((variable) => variable.key.slice(DISMISSED_SUGGESTION_KEY_PREFIX.length)))),
            catchError(() => of(new Set<string>())),
        );
    }

    private buildView(
        exportMissing: boolean,
        suggestions: AutomationSuggestion[],
        catalog: AutomationCatalog,
        active: ActiveModule[],
        dismissed: Set<string>,
    ): AutomationSuggestionsView {
        const resolvedById = new Map<string, ResolvedSuggestion>();
        for (const suggestion of suggestions) {
            const resolved = resolveSuggestion(suggestion, catalog);
            if (resolved !== null && !resolvedById.has(suggestion.id)) {
                resolvedById.set(suggestion.id, resolved);
            }
        }
        const moduleById = new Map(active.map((a) => [a.suggestionId, a]));
        const accepted = (module: ActiveModule): ActiveAutomation => {
            const resolved = resolvedById.get(module.suggestionId) ?? null;
            return {
                moduleId: module.moduleId,
                suggestionId: module.suggestionId,
                label: resolved?.label ?? module.moduleName,
                suggestion: resolved,
                autoOffS: module.autoOffS,
            };
        };

        // one list in the order of the export: an accepted suggestion keeps its place and changes only its state
        const items: ViewItem[] = [];
        const placed = new Set<string>();
        for (const suggestion of suggestions) {
            const id = suggestion.id;
            if (placed.has(id)) {
                continue;
            }
            const module = moduleById.get(id);
            const resolved = resolvedById.get(id);
            if (module !== undefined) {
                items.push({ kind: 'accepted', automation: accepted(module) });
            } else if (resolved !== undefined && !dismissed.has(id)) {
                items.push({ kind: 'open', resolved });
            } else {
                continue;
            }
            placed.add(id);
        }
        for (const module of active) {
            if (!placed.has(module.suggestionId)) {
                items.push({ kind: 'accepted', automation: accepted(module) });
                placed.add(module.suggestionId);
            }
        }

        return {
            exportMissing,
            items,
            dismissed: [...resolvedById.values()].filter((r) => dismissed.has(r.suggestion.id) && !moduleById.has(r.suggestion.id)),
        };
    }

    /**
     * Device names, device types, the measured function of each non-binary target and the controlling
     * functions of their concepts. Each lookup runs once per call, and only when there is something to look up.
     */
    private loadCatalog(suggestions: AutomationSuggestion[]): Observable<AutomationCatalog> {
        const deviceIds = unique(suggestions.flatMap((s) => [s.trigger.device_id, ...s.targets.map((t) => t.device_id)]));
        if (deviceIds.length === 0) {
            return of(emptyCatalog());
        }
        return this.deviceInstancesService.getDeviceListByIds(deviceIds).pipe(
            switchMap((devices) => {
                const deviceNames = new Map(devices.map((d) => [d.id, d.display_name || d.name]));
                return this.loadDeviceTypes(unique(devices.map((d) => d.device_type_id))).pipe(
                    switchMap((types) => {
                        const typeById = new Map(types.map((t) => [t.id, t]));
                        const deviceTypes = new Map<string, DeviceTypeModel>();
                        devices.forEach((d) => {
                            const type = typeById.get(d.device_type_id);
                            if (type !== undefined) {
                                deviceTypes.set(d.id, type);
                            }
                        });
                        const measuredFunctionIds = this.measuredFunctionIdsOf(suggestions, deviceTypes);
                        return this.loadFunctions(unique([...measuredFunctionIds.values()])).pipe(
                            switchMap((functions) => {
                                const functionsById = new Map(functions.map((f) => [f.id, f]));
                                return this.loadControllingFunctions(unique(functions.map((f) => f.concept_id).filter((c) => !!c))).pipe(
                                    map((controllingFunctionsByConcept) => ({
                                        deviceNames,
                                        deviceTypes,
                                        measuredFunctionIds,
                                        functionsById,
                                        controllingFunctionsByConcept,
                                    })),
                                );
                            }),
                        );
                    }),
                );
            }),
        );
    }

    private measuredFunctionIdsOf(suggestions: AutomationSuggestion[], deviceTypes: Map<string, DeviceTypeModel>): Map<string, string> {
        const result = new Map<string, string>();
        for (const suggestion of suggestions) {
            for (const target of suggestion.targets) {
                if (typeof target.value === 'boolean') {
                    continue;
                }
                const path = devicePath(target.path);
                const key = measuredFunctionKey(target.device_id, target.service_id, path);
                const deviceType = deviceTypes.get(target.device_id);
                const service = deviceType?.services.find((s) => s.id === target.service_id);
                if (result.has(key) || service === undefined) {
                    continue;
                }
                for (const output of service.outputs ?? []) {
                    for (const entry of this.deviceTypeService.getValuePathsAndContentVariables(output.content_variable)) {
                        if (entry.path === path && entry.contentVariable.function_id) {
                            result.set(key, entry.contentVariable.function_id);
                        }
                    }
                }
            }
        }
        return result;
    }

    private loadDeviceTypes(typeIds: string[]): Observable<DeviceTypeModel[]> {
        return typeIds.length === 0 ? of([]) : this.deviceTypeService.getDeviceTypeListByIds(typeIds);
    }

    private loadFunctions(functionIds: string[]): Observable<DeviceTypeFunctionModel[]> {
        return functionIds.length === 0 ? of([]) : this.deviceTypeService.getFunctionsByIds(functionIds);
    }

    private loadControllingFunctions(conceptIds: string[]): Observable<Map<string, DeviceTypeFunctionModel[]>> {
        if (conceptIds.length === 0) {
            return of(new Map());
        }
        return this.functionsService.getFunctionsByConceptIds(conceptIds).pipe(
            map((functions) => {
                const byConcept = new Map<string, DeviceTypeFunctionModel[]>();
                functions
                    .filter((f) => f.rdf_type === CONTROLLING_FUNCTION_RDF_TYPE)
                    .forEach((f) => {
                        byConcept.set(f.concept_id, [...(byConcept.get(f.concept_id) ?? []), f]);
                    });
                return byConcept;
            }),
        );
    }
}

/** The switch-off delay of a module: a number, null for none, undefined when the module does not carry the field. */
function moduleAutoOffS(value: unknown): number | null | undefined {
    if (value === null) {
        return null;
    }
    return typeof value === 'number' ? value : undefined;
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}

function emptyCatalog(): AutomationCatalog {
    return {
        deviceNames: new Map(),
        deviceTypes: new Map(),
        measuredFunctionIds: new Map(),
        functionsById: new Map(),
        controllingFunctionsByConcept: new Map(),
    };
}
