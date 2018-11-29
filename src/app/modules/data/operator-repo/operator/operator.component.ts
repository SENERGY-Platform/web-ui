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
import {IOModel, OperatorModel} from '../shared/operator.model';
import {ActivatedRoute} from '@angular/router';
import {OperatorRepoService} from '../shared/operator-repo.service';
import {IO, Operator} from '../shared/operator.classes';
import {MatSnackBar} from '@angular/material';


@Component({
    selector: 'senergy-operator',
    templateUrl: './operator.component.html',
    styleUrls: ['./operator.component.css']
})
export class OperatorComponent implements OnInit {

    operator = new Operator ();
    dropdown = [
        'float',
        'string',
        'int'
    ];

    constructor(private route: ActivatedRoute, private operatorService: OperatorRepoService, public snackBar: MatSnackBar) {
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.operatorService.getOperator(id).subscribe((resp: OperatorModel | null) => {
                if (resp !== null) {
                    this.operator = resp;
                    console.log(resp);
                }
            });
        }
    }

    addInput() {
        if (this.operator.inputs !== undefined) {
            this.operator.inputs.push(new IO());
        }
    }

    deleteInput(input: IOModel) {
        if (this.operator.inputs !== undefined) {
            const index = this.operator.inputs.indexOf(input);
            if (index > -1) {
                this.operator.inputs.splice(index, 1);
            }
        }
    }

    addOutput() {
        if (this.operator.outputs !== undefined) {
            this.operator.outputs.push(new IO());
        }
    }

    deleteOutput(output: IOModel) {
        if (this.operator.outputs !== undefined) {
            const index = this.operator.outputs.indexOf(output);
            if (index > -1) {
                this.operator.outputs.splice(index, 1);
            }
        }
    }

    saveOperator() {
        this.operatorService.saveOperator(this.operator).subscribe();
        this.snackBar.open('Operator saved', undefined, {
            duration: 2000,
        });
    }
}
