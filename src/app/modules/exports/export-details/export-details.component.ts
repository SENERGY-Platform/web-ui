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

import {Component, OnInit} from '@angular/core';
import {ExportModel} from '../shared/export.model';
import {ActivatedRoute} from '@angular/router';
import {ExportService} from '../shared/export.service';
import {ExportDataService} from '../../../widgets/shared/export-data.service';
import {LastValuesRequestElementModel} from '../../../widgets/shared/export-data.model';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';


@Component({
    selector: 'senergy-export-details',
    templateUrl: './export-details.component.html',
    styleUrls: ['./export-details.component.css']
})

export class ExportDetailsComponent implements OnInit {

    ready = false;
    export = {} as ExportModel;
    displayedColumns: string[] = ['Name', 'Path', 'Type', 'LastValue', 'LastTimeStamp'];
    lastValuesReady = false;
    lastValuesRequestElementModels: LastValuesRequestElementModel[] = [];

    constructor(private route: ActivatedRoute, private exportService: ExportService, private exportDataService: ExportDataService) {
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.exportService.getExport(id).subscribe((resp: ExportModel | null) => {
                if (resp !== null) {
                    this.export = resp;
                }

                this.export?.Values.forEach(value => {
                        if (this.export?.Measurement !== undefined) {
                            this.lastValuesRequestElementModels.push({
                                measurement: this.export?.Measurement,
                                columnName: value.Name,
                                math: undefined
                            });
                        }
                    }
                );

                this.getLatestValues().subscribe(() => this.lastValuesReady = true);
                this.ready = true;
            });
        }
    }

    refreshValues() {
        this.lastValuesReady = false;
        this.getLatestValues().subscribe(() => this.lastValuesReady = true);
    }

    private getLatestValues(): Observable<void> {
        return this.exportDataService.getLastValues(this.lastValuesRequestElementModels).pipe(map(pairs => {
            this.export.Values.forEach((_, index) => {
                this.export.Values[index].LastValue = pairs[index].value;
                this.export.Values[index].LastTimeStamp = '' + pairs[index].time;
            });
        }));
    }
}
