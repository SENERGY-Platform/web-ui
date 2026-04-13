/*
 * Copyright 2026 InfAI (CC SES)
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
 *  limitations under the License.
 */

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ServingRequest, SmartServiceTaskDescription} from '../../../shared/designer.model';
import {BpmnParameterWithLabel} from '../../../../../processes/designer/shared/designer.model';
import {ExportDatabaseModel} from '../../../../../exports/shared/export.model';
import {ExportService} from '../../../../../exports/shared/export.service';

@Component({
  selector: 'esstd-export-component',
  standalone: false,
  templateUrl: './esstd-export-component.component.html',
  styleUrl: './esstd-export-component.component.css'
})
export class EsstdExportComponentComponent implements OnInit {
    @Input() result!: SmartServiceTaskDescription;
    @Output() resultChange = new EventEmitter<SmartServiceTaskDescription>();

    @Input() exportRequest!: ServingRequest;
    @Output() exportRequestChange = new EventEmitter<ServingRequest>();

    @Input() availableProcessVariables!: Map<string, BpmnParameterWithLabel[]>;

    exportDatabaseList: ExportDatabaseModel[] = [];

    constructor(private exportService: ExportService) {
    }
    ngOnInit() {
        this.ensureExportDatabaseList();
    }
    removeExportValue(index: number) {
        this.exportRequest?.Values?.splice(index, 1);
    }

    addExportValue() {
        if (!this.exportRequest) {
            this.exportRequest = JSON.parse('{}');
        }
        if (!this.exportRequest.Values) {
            this.exportRequest.Values = [];
        }
        this.exportRequest?.Values.push({ Name: '', Path: '', Type: 'string', Tag: false });
    }

    ensureExportDatabaseList() {
        if (this.exportDatabaseList.length === 0) {
            this.exportService.getExportDatabases().subscribe(value => {
                this.exportDatabaseList = value;
            });
        }
    }
}
