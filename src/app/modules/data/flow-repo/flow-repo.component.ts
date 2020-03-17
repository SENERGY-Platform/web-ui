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
import {MatSnackBar} from '@angular/material/snack-bar';
import {FlowModel} from './shared/flow.model';
import {FlowRepoService} from './shared/flow-repo.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DomSanitizer} from '@angular/platform-browser';
import {ResponsiveService} from '../../../core/services/responsive.service';

const GRIDS = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './flow-repo.component.html',
    styleUrls: ['./flow-repo.component.css']
})

export class FlowRepoComponent implements OnInit {

    flows: FlowModel[] = [];
    ready = false;
    gridCols =  0;

    constructor(private flowRepoService: FlowRepoService,
                public snackBar: MatSnackBar,
                private responsiveService: ResponsiveService,
                private dialogsService: DialogsService,
                private sanitizer: DomSanitizer) {
    }

    ngOnInit() {
        this.initGridCols();
        this.flowRepoService.getFlows().subscribe((resp: {flows: FlowModel[]}) => {
            this.flows = resp.flows;
            this.flows.forEach((flow: FlowModel) => {
                if (typeof flow.image === 'string') {
                    flow.image = this.sanitizer.bypassSecurityTrustHtml(flow.image);
                }
            });
            this.ready = true;
        });
    }

    deleteFlow(flow: FlowModel) {
        this.dialogsService.openDeleteDialog('flow').afterClosed().subscribe((deleteFlow: boolean) => {
            if (deleteFlow) {
                const index = this.flows.indexOf(flow);
                if (index > -1) {
                    this.flows.splice(index, 1);
                }
                this.flowRepoService.deleteFlow(flow).subscribe();
                this.snackBar.open('Flow deleted', undefined, {
                    duration: 2000,
                });
            }
        });
    }

    private initGridCols(): void {
        this.gridCols = GRIDS.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = GRIDS.get(mqAlias) || 0;
        });
    }
}
