/*
 * Copyright 2019 InfAI (CC SES)
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
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceTypeService} from '../../../devices/device-types/shared/device-type.service';
import {DeviceTypeAssignmentModel, DeviceTypeModel, DeviceTypeServiceModel} from '../../../devices/device-types/shared/device-type.model';
import {ExportModel, ExportValueModel} from '../shared/export.model';
import {ExportService} from '../shared/export.service';
import {MatSnackBar} from '@angular/material';
import {PipelineModel, PipelineOperatorModel} from '../../pipeline-registry/shared/pipeline.model';
import {PipelineRegistryService} from '../../pipeline-registry/shared/pipeline-registry.service';
import {ActivatedRoute, Router} from '@angular/router';
import {IOModel, OperatorModel} from '../../operator-repo/shared/operator.model';
import {ValueTypesFieldTypeModel} from '../../../devices/value-types/shared/value-types.model';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {DialogsService} from '../../../../core/services/dialogs.service';
import {ResponsiveService} from '../../../../core/services/responsive.service';
import {ClipboardService} from 'ngx-clipboard';


@Component({
    selector: 'senergy-export-details',
    templateUrl: './export-details.component.html',
    styleUrls: ['./export-details.component.css']
})

export class ExportDetailsComponent implements OnInit{

    ready = false;
    export = {} as ExportModel;

    constructor(private route: ActivatedRoute, private exportService: ExportService) {
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
        this.exportService.getExport(id).subscribe((resp: ExportModel | null) => {
            if (resp !== null) {
                this.export = resp;
            }
            this.ready = true;
        });
        }
    }
}
