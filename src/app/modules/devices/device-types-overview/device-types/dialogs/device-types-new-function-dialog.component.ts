/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, OnInit} from '@angular/core';
import {MatDialogRef, MatSnackBar} from '@angular/material';
import {FormControl, Validators} from '@angular/forms';
import {DeviceTypeConceptModel} from '../../shared/device-type.model';

@Component({
    templateUrl: './device-types-new-function-dialog.component.html',
    styleUrls: ['./device-types-new-function-dialog.component.css']
})
export class DeviceTypesNewFunctionDialogComponent implements OnInit {

    nameControl = new FormControl('', [Validators.required]);
    categoriesControl = new FormControl('', [Validators.required]);
    categories: DeviceTypeConceptModel[] = [];

    constructor(private snackBar: MatSnackBar,
                private dialogRef: MatDialogRef<DeviceTypesNewFunctionDialogComponent>) {
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close();
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    ngOnInit(): void {
        this.categories = [
            {
                id: 'urn:infai:ses:category:1',
                name: 'color',
                characteristics: [
                    {
                        id: 'urn:infai:ses:categoryvariable:1',
                        name: 'rgb',
                        type: 'http://schema.org/structure',
                        sub_characteristics: [
                            {
                                id: 'urn:infai:ses:categoryvariable:2',
                                name: 'r',
                                type: 'xsd:integer',
                                min_value: 0,
                                max_value: 0,
                            }
                        ]
                    }]
            },
            {
                id: 'urn:infai:ses:category:2',
                name: 'temperature',
                characteristics: [{
                    id: 'urn:infai:ses:categoryvariable:1',
                    name: 'DegreeCelsius',
                    type: 'xsd:float',
                }]
            },
        ];
    }
}
