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
import {BpmnElement, BpmnParameterWithLabel} from '../../../../../processes/designer/shared/designer.model';
import {ExportDatabaseModel} from '../../../../../exports/shared/export.model';
import {ExportService} from '../../../../../exports/shared/export.service';
import {AddTagFn} from '@ng-matero/extensions/select';
import {FlowRepoService} from '../../../../../data/flow-repo/shared/flow-repo.service';
import {OperatorRepoService} from '../../../../../data/operator-repo/shared/operator-repo.service';
import {OperatorModel, typeStructure} from '../../../../../data/operator-repo/shared/operator.model';

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
    @Input() smartServiceBpmnElement!: BpmnElement;

    exportDatabaseList: ExportDatabaseModel[] = [];

    timestamp_formats: string[] = [];

    paths = new Map<string, string | undefined>();

    constructor(private exportService: ExportService,
                private flowRepoService: FlowRepoService,
                private operatorRepoService: OperatorRepoService,) {
    }
    ngOnInit() {
        this.ensureExportDatabaseList();
        this.timestamp_formats = this.exportService.getTimestampFormats();
        if (this.exportRequest.Name === undefined) {
            this.exportRequest.Name = 'Smart_Service_' + this.smartServiceBpmnElement.id;
        }
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

    getOperatorInfo(flowId: string, operatorId: string) {
        this.flowRepoService.getFlow(flowId).subscribe(flow => {
           flow?.model.cells.forEach(cell => {
              if (cell.id === operatorId) {
                  this.operatorRepoService
                      .getOperator(cell.operatorId)
                      .subscribe((resp: OperatorModel | null) => {
                          this.paths = this.operatorRepoService.setPaths(resp);
                          this.paths.set('time', 'string');
                          this.paths.set('analytics', typeStructure);
                      });
              }
           });
        });
    }

    addTimestampFormat(): AddTagFn {
        return (text: string) => {
            this.timestamp_formats.push(text);
        };
    }

    protected readonly Array = Array;
}
