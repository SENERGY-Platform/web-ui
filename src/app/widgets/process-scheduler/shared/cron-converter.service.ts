/*
 * Copyright 2020 InfAI (CC SES)
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

import {Injectable} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {Observable} from 'rxjs';
import {ProcessSchedulerModel} from './process-scheduler.model';
import {ProcessModel} from '../../../modules/processes/process-repo/shared/process.model';
import {ProcessRepoService} from '../../../modules/processes/process-repo/shared/process-repo.service';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/internal/operators';
import {HttpClient, HttpResponseBase} from '@angular/common/http';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {ProcessSchedulerScheduleDialogComponent} from '../dialogs/process-scheduler-schedule-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ProcessSchedulerScheduleEditDialogComponent} from '../dialogs/process-scheduler-schedule-edit-dialog.component';


@Injectable({
    providedIn: 'root'
})
export class CronConverterService {

    constructor() {
    }

    getLocalTime(cron: string): string {
        const min = cron.split(' ')[0];
        const hours = cron.split(' ')[1];

        const date = new Date();
        date.setUTCHours(parseInt(hours, 10));
        date.setUTCMinutes(parseInt(min, 10));

        let time = date.getHours() + ':';
        if (date.getMinutes() < 10) {
            time += '0' + date.getMinutes();
        } else {
            time += date.getMinutes();
        }
        return time;
    }

    getDaysAsBoolArray(cron: string): boolean[] {
        const days = cron.split(' ')[4].split(',');
        // index[0] => sunday; index[1] => monday
        const boolArray: boolean[] = [false, false, false, false, false, false, false];
        days.forEach((day: string) => {
            boolArray[parseInt(day, 10)] = true;
        });
        return boolArray;
    }

    getLocalTimeAndDaysAsString(cron: string): string {
        return this.getLocalTime(cron) + ' ' + this.getDaysAsConcatenatedString(cron);
    }

    getDaysAsConcatenatedString(cron: string): string {
        const daysIntArray = cron.split(' ')[4].split(',');
        // index[0] => sunday; index[1] => monday
        const daysAsString = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const daysResult: string[] = [];
        daysIntArray.forEach((dayInt: string) => {
            daysResult.push(daysAsString[parseInt(dayInt, 10)]);
        });
        return daysResult.join();
    }

}

