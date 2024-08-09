/*
 * Copyright 2024 InfAI (CC SES)
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

import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from 'src/app/core/services/util.service';
import {TemplateModel, TemplateResponseModel} from '../shared/template.model';
import {TemplateService} from '../shared/template.service';
import {ActivatedRoute} from '@angular/router';

@Component({
    selector: 'senergy-reports-new',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css'],
})
export class ReportComponent implements OnInit {
    template: TemplateModel = {} as TemplateModel;
    ready = false;
    templateId: string | null = "";
    requestObject: Map<string, any> = new Map<string, any>();

    constructor(
        private route: ActivatedRoute,
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private templateService: TemplateService,
    ) {
        this.templateId = this.route.snapshot.paramMap.get('templateId');
    }

    ngOnInit() {
        if (this.templateId != null) {
            this.templateService.getTemplate(this.templateId).subscribe((resp: TemplateResponseModel | null) => {
                if (resp !== null) {
                    this.template = resp.data;
                }
                this.ready = true;
            });
        }
    }

    save(){
        console.log(this.template);
        this.templateService.createReport({id: 'test', data: this.template.data?.dataStructured}).subscribe();
    }
}
