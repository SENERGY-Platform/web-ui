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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ValueHighlightConfig } from '../../shared/single-value.model';
import { AddThresholdComponent } from '../add-threshold/add-threshold.component';

@Component({
    selector: 'single-value-threshold',
    templateUrl: './threshold.component.html',
    styleUrls: ['./threshold.component.css']
})
export class ThresholdComponent implements OnInit {
    displayedColumns = ['threshold', 'direction', 'color', 'edit', 'delete'];
    dataSource = new MatTableDataSource<ValueHighlightConfig>();
    @Output() threshholdConfigUpdated = new EventEmitter<ValueHighlightConfig[]>();
    @Input() oldConfigs: ValueHighlightConfig[] = [];

    constructor(
        public dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.dataSource = new MatTableDataSource(this.oldConfigs);
    }

    edit(index: number) {
        const oldConfig = this.dataSource.data[index];
        this.dialog.open(AddThresholdComponent, {data: oldConfig}).afterClosed().subscribe({
            next: (rule: ValueHighlightConfig) => {
                if(rule != null) {
                    this.dataSource.data.splice(index, 1);
                    this.dataSource.data.push(rule);
                    this.dataSource.data = this.dataSource.data;
                    this.emitCurrentConfig();
                }
            },
            error: (_) => {
            }
        });
    }

    delete(index: number) {
        this.dataSource.data.splice(index, 1);
        this.dataSource.data = this.dataSource.data;
        this.emitCurrentConfig();
    }

    add() {
        this.dialog.open(AddThresholdComponent).afterClosed().subscribe({
            next: (rule: ValueHighlightConfig) => {
                if(rule != null) {
                    this.dataSource.data.push(rule);
                    this.dataSource.data = this.dataSource.data;
                    this.emitCurrentConfig();
                }
            },
            error: (_) => {
            }
        });
    }

    emitCurrentConfig() {
        this.threshholdConfigUpdated.emit(this.dataSource.data);
    }
}
