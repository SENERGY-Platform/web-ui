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

import { Injectable } from '@angular/core';
import {toString} from 'cronstrue'

@Injectable({
    providedIn: 'root',
})
export class CronConverterService {
    constructor() {}

    getLocalTime(cron: string): string {
        const min = cron.split(' ')[0];
        const hours = cron.split(' ')[1];

        return this.getLocalTimeFromMinHours(min, hours);
    }

    getLocalTimeFromMinHours(min: string, hours: string): string {
        const date = new Date();
        date.setUTCHours(Number(hours));
        date.setUTCMinutes(Number(min));

        let time = '';
        if (date.getHours() < 10) {
            time += '0';
        }
        time += date.getHours();
        time += ':';
        if (date.getMinutes() < 10) {
            time += '0';
        }
        time += date.getMinutes();
        return time;
    }

    getDaysAsBoolArray(cron: string): boolean[] {
        const days = cron.split(' ')[4].split(',');
        // index[0] => sunday; index[1] => monday
        const boolArray: boolean[] = [false, false, false, false, false, false, false];
        days.forEach((day: string) => {
            boolArray[Number(day)] = true;
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
            daysResult.push(daysAsString[Number(dayInt)]);
        });
        return daysResult.join();
    }

    getCronAsString(time: string, daysAsBoolArray: boolean[]): string {
        const cronDays: number[] = [];
        daysAsBoolArray.forEach((day: boolean, index: number) => {
            if (day === true) {
                cronDays.push(index);
            }
        });
        const date = new Date();
        date.setHours(Number(time.split(':')[0]));
        date.setMinutes(Number(time.split(':')[1]));
        return date.getUTCMinutes() + ' ' + date.getUTCHours() + ' * * ' + cronDays.join();
    }

    hasSecondsField(cron: string): boolean {
        const matches = cron.trim().match(/\S+/g);
        return matches !== null && matches.length > 5;
    }

    getHumanReadableString(cron: string): string {
        let str = toString(cron, { use24HourTimeFormat: true })
            // abbrev. days
            .replace('Monday', 'Mo')
            .replace('Tuesday', 'Tu')
            .replace('Wednesday', 'We')
            .replace('Thursday', 'Th')
            .replace('Friday', 'Fr')
            .replace('Saturday', 'Sa')
            .replace('Sunday', 'Su')
            .replace('only ', '')
            .replace(' past the minute', '');
        // localize time
        const times = str.match(/\d\d:\d\d/);
        if (times !== null && times.length === 1) {
            const timeparts = times[0].match(/\d+/g);
            if (timeparts !== null && timeparts.length === 2) {
                str = str.replace(times[0], this.getLocalTimeFromMinHours(timeparts[1], timeparts[0]));
            }
        }
        return str;
    }
}
