/*
 * Copyright 2018 InfAI (CC SES)
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
import {ExportService} from './shared/export.service';
import {ExportModel} from './shared/export.model';
import {environment} from '../../../../environments/environment';
import {MatSnackBar} from '@angular/material';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ResponsiveService} from '../../../core/services/responsive.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 2],
    ['md', 2],
    ['lg', 4],
    ['xl', 4],
]);

@Component({
    selector: 'senergy-export',
    templateUrl: './export.component.html',
    styleUrls: ['./export.component.css']
})

export class ExportComponent implements OnInit {

    exports: ExportModel[] = [];
    ready = false;
    url = environment.influxAPIURL;
    gridCols = 0;

    constructor(private exportService: ExportService,
                public snackBar: MatSnackBar,
                private dialogsService: DialogsService,
                private responsiveService: ResponsiveService) {
    }

    ngOnInit() {
        this.initGridCols();
        this.exportService.getExports().subscribe((resp: ExportModel [] | null) => {
            if (resp !== null) {
                this.exports = resp;
            }
            this.ready = true;
        });
    }

    deleteExport(exp: ExportModel) {
        this.dialogsService.openDeleteDialog('export').afterClosed().subscribe((deleteExport: boolean) => {
            if (deleteExport) {
                const index = this.exports.indexOf(exp);
                if (index > -1) {
                    this.exports.splice(index, 1);
                }
                this.exportService.stopPipeline(exp).subscribe();
                this.snackBar.open('Export deleted', undefined, {
                    duration: 2000,
                });
            }
        });

    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }
}
