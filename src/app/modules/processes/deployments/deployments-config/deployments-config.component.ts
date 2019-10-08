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
import {ActivatedRoute} from '@angular/router';
import {DesignerProcessModel} from '../../designer/shared/designer.model';
import {DeploymentsPreparedModel} from '../shared/deployments-prepared.model';
import {ProcessRepoService} from '../../process-repo/shared/process-repo.service';
import {DeploymentsService} from '../shared/deployments.service';
import {UtilService} from '../../../../core/services/util.service';


@Component({
    selector: 'senergy-process-deployments-config',
    templateUrl: './deployments-config.component.html',
    styleUrls: ['./deployments-config.component.css']
})

export class ProcessDeploymentsConfigComponent implements OnInit {

    processId = '';

    constructor(private route: ActivatedRoute,
                private processRepoService: ProcessRepoService,
                private utilService: UtilService,
                private deploymentsService: DeploymentsService) {
    }

    ngOnInit() {
        this.processId = this.route.snapshot.paramMap.get('id') || '';
        this.deploy();
    }

    deploy(): void {
        this.processRepoService.getProcessModel(this.processId).subscribe((resp: DesignerProcessModel | null) => {
            if (resp !== null) {
                const xml = this.utilService.convertJSONtoXML(resp.process);
                this.deploymentsService.getPreparedDeployments(xml).subscribe((deployment: DeploymentsPreparedModel | null) => {
                    if (deployment !== null) {
                        console.log(deployment);
                    }
                });
            }
        });
    }
}
