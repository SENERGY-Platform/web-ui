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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { dialogSize } from 'src/app/core/dialog-size';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { openWidgetEditDialog } from 'src/app/modules/dashboard/shared/open-widget-edit-dialog';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { initParameterValues, parametersSatisfied, toSmartServiceParameters } from 'src/app/modules/smart-services/instances/shared/parameters';
import { SmartServiceExtendedParameterModel } from 'src/app/modules/smart-services/releases/shared/release.model';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { HeatingScheduleEditComponent } from '../dialog/edit/edit.component';
import { HEATING_SCHEDULE_PARAMETER, HEATING_SETBACK_PARAMETER, HEATING_THERMOSTATS_PARAMETER } from './heating-schedule.model';
import { HeatingPlanError } from './heating-schedule.plan';
import { resolveSchedule } from './heating-schedule.zones';

@Injectable({
    providedIn: 'root',
})
export class HeatingScheduleService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private releasesService = inject(SmartServiceReleasesService);
    private instancesService = inject(SmartServiceInstanceService);
    private snackBar = inject(MatSnackBar);

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, HeatingScheduleEditComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization,
        }, dialogSize('m'));
    }

    /**
     * Writes schedule and setback. The repository replaces the whole parameter list, so the instance is read
     * again right before and every other parameter keeps the value it has there, not the one the widget loaded.
     */
    saveSchedule(instanceId: string, schedule: string, setback: number): Observable<boolean> {
        return this.instancesService.getInstance(instanceId).pipe(
            concatMap((instance) => {
                if (instance === null) {
                    snackError(this.snackBar, 'Could not load the smart service!');
                    return of(false);
                }
                return this.releasesService.getReleaseParameters(instance.release_id).pipe(
                    concatMap((loaded) => this.write(instance, loaded, schedule, setback)),
                );
            }),
        );
    }

    private write(instance: SmartServiceInstanceModel, loaded: SmartServiceExtendedParameterModel[] | null, schedule: string, setback: number): Observable<boolean> {
        if (loaded === null) {
            snackError(this.snackBar, 'Could not load the smart service parameters!');
            return of(false);
        }
        const parameters = initParameterValues(loaded, instance.parameters).parameters;
        const scheduleParameter = parameters.find((parameter) => parameter.id === HEATING_SCHEDULE_PARAMETER);
        const setbackParameter = parameters.find((parameter) => parameter.id === HEATING_SETBACK_PARAMETER);
        if (scheduleParameter === undefined || setbackParameter === undefined) {
            snackError(this.snackBar, 'The smart service has no schedule parameters.');
            return of(false);
        }
        // the thermostats may have changed since the editor opened; a plan without a process would be refused by the service
        try {
            resolveSchedule(schedule, setback, instance.parameters?.find((parameter) => parameter.id === HEATING_THERMOSTATS_PARAMETER)?.value);
        } catch (error) {
            snackError(this.snackBar, 'The zones no longer fit the thermostats: ' + (error instanceof HeatingPlanError ? error.message : 'unknown error'));
            return of(false);
        }
        scheduleParameter.value = schedule;
        setbackParameter.value = setback;
        if (!parametersSatisfied(parameters)) {
            snackError(this.snackBar, 'A parameter of the smart service has no valid value. Edit the smart service to fix it.');
            return of(false);
        }
        return this.instancesService.updateInstanceParameters(instance.id, toSmartServiceParameters(parameters)).pipe(map((updated) => {
            if (updated === null) {
                return false;
            }
            snackSuccess(this.snackBar, 'Heating schedule saved.');
            return true;
        }));
    }
}
