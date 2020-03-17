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
import {OperatorModel} from './shared/operator.model';
import {OperatorRepoService} from './shared/operator-repo.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ResponsiveService} from '../../../core/services/responsive.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './operator-repo.component.html',
    styleUrls: ['./operator-repo.component.css']
})
export class OperatorRepoComponent implements OnInit {

    operators = [] as OperatorModel[];
    ready = false;
    gridCols = 0;

    constructor(private operatorRepoService: OperatorRepoService,
                protected auth: AuthorizationService,
                public snackBar: MatSnackBar,
                private dialogsService: DialogsService,
                private responsiveService: ResponsiveService) {
    }

    ngOnInit() {
        this.initGridCols();
        const userId = this.auth.getUserId();
        this.operatorRepoService.getOperators().subscribe((resp: {operators: OperatorModel[]}) => {
            for (const operator of resp.operators) {
                if (operator.userId === userId) {
                    operator.editable = true;
                } else {
                    operator.editable = false;
                }
            }
            this.operators = resp.operators;
            this.ready = true;
        });
    }

    deleteOperator(operator: OperatorModel) {
        this.dialogsService.openDeleteDialog('operator').afterClosed().subscribe((operatorDelete: boolean) => {
           if (operatorDelete) {
               const index = this.operators.indexOf(operator);
               if (index > -1) {
                   this.operators.splice(index, 1);
               }
               this.operatorRepoService.deleteOeprator(operator).subscribe();
               this.snackBar.open('Operator deleted', undefined, {
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
