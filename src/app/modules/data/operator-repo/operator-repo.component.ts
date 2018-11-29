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
import {OperatorModel} from './shared/operator.model';
import {OperatorRepoService} from './shared/operator-repo.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatSnackBar} from '@angular/material';


@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './operator-repo.component.html',
    styleUrls: ['./operator-repo.component.css']
})
export class OperatorRepoComponent implements OnInit {

    operators: OperatorModel[] = [];
    ready = false;

    constructor(private operatorRepoService: OperatorRepoService, protected auth: AuthorizationService, public snackBar: MatSnackBar) {
    }

    ngOnInit() {
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
        const index = this.operators.indexOf(operator);
        if (index > -1) {
            this.operators.splice(index, 1);
        }
        this.operatorRepoService.deleteOeprator(operator).subscribe();
        this.snackBar.open('Operator deleted', undefined, {
            duration: 2000,
        });
    }
}
