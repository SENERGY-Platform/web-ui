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

import { AfterViewInit, Component, ElementRef, Inject } from '@angular/core';
import { ChartsExportVAxesModel } from '../../charts/export/shared/charts-export-properties.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { concatMap, map } from 'rxjs';

@Component({
  selector: 'senergy-connection-history-dialog',
  templateUrl: './connection-history-dialog.component.html',
  styleUrl: './connection-history-dialog.component.css'
})
export class ConnectionHistoryDialogComponent implements AfterViewInit {
    ready = false;
    connectionHistory: any[][][] = [];
    baseAxis = {
            exportName: ' ',
            valueAlias: 'Period',
            conversions: [
                { from: true, to: true, alias: 'Online', color: '#097969' },
                { from: false, to: false, alias: 'Offline', color: '#C41E3A' }
            ],

        };
    timelineAxes: ChartsExportVAxesModel[] = [];
    id = '';
    width = 0;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: {
              id: string
            },
        private el: ElementRef,
        private dialogRef: MatDialogRef<ConnectionHistoryDialogComponent>,
        private deviceInstancesService: DeviceInstancesService,
    ) {
        this.id = data.id;
    }
    ngAfterViewInit(): void {
       this.width = window.innerWidth * 0.75;
       this.deviceInstancesService.getHistory({ ids: [this.id], range: '168h' }).pipe(
        map(m => {
            this.connectionHistory = [];
            this.timelineAxes = [];
            const deviceIds: string[] = [];    
            Array.from(m.values()).forEach((histories, i) => {
                histories.forEach((history, j) => {
                    this.connectionHistory.push([[]]);
                    this.timelineAxes.push(JSON.parse(JSON.stringify(this.baseAxis as ChartsExportVAxesModel)));
                    if (i+j > 0) {
                        this.timelineAxes[i+j].valueAlias += ' ' + (i+j);
                    }
                    deviceIds.push(history.id);
                    if (history?.prev_state) {
                        this.connectionHistory[i+j][0].push([history.prev_state.time, history.prev_state.connected]);
                    }
                    if (history?.states) {
                        this.connectionHistory[i+j][0].push(...(history.states.map(s => [s.time, s.connected])));
                    }
                    if (this.connectionHistory[i+j][0].length > 0) {
                        // continue last state to current
                        this.connectionHistory[i+j][0].push([new Date().toISOString(), this.connectionHistory[0][0][this.connectionHistory[0][0].length - 1][1]]);
                    }
                    this.connectionHistory[i+j][0].reverse();
                });
            });
            return deviceIds;
        }),
        concatMap(deviceIds => {
            return this.deviceInstancesService.getDeviceListByIds(deviceIds);
        }),
        map(devices => {
            devices.forEach((d, i) =>  this.timelineAxes[i].valueAlias = d.display_name);
            return;
        }),
    ).subscribe(_ => this.ready = true);
            
    }

    close() {
        this.dialogRef.close();
    }
}