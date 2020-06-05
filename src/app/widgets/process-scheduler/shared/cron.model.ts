/*
 *
 *   Copyright 2020 InfAI (CC SES)
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

export class CronModel {
    private cron: string;

    constructor(
        cron: string,
    ) {
        this.cron = cron;
    }

    getLocalTime(): string {
        const min = this.cron.split(' ')[0];
        const hours = this.cron.split(' ')[1];

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

    getDaysAsBoolArray(): boolean[] {
        const days = this.cron.split(' ')[4].split(',');
        // index[0] => sunday; index[1] => monday
        const boolArray: boolean[] = [false, false, false, false, false, false, false];
        days.forEach((day: string) => {
            boolArray[parseInt(day, 10)] = true;
        });
        return boolArray;
    }

    getLocalTimeAndDaysAsString(): string {
        return this.getLocalTime() + ' ' + this.getDaysAsConcatenatedString();
    }

    getDaysAsConcatenatedString(): string {
        const daysIntArray = this.cron.split(' ')[4].split(',');
        // index[0] => sunday; index[1] => monday
        const daysAsString = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const daysResult: string[] = [];
        daysIntArray.forEach((dayInt: string) => {
            daysResult.push(daysAsString[parseInt(dayInt, 10)]);
        });
        return daysResult.join();
    }
}
