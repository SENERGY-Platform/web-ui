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
 * limitations under the License.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ProcessDeploymentsConfigComponent } from './deployments-config.component';
import { ProcessRepoService } from '../../process-repo/shared/process-repo.service';
import { DeploymentsService } from '../shared/deployments.service';
import { UtilService } from '../../../../core/services/util.service';
import { FlowRepoService } from '../../../data/flow-repo/shared/flow-repo.service';
import { OperatorRepoService } from '../../../data/operator-repo/shared/operator-repo.service';
import { NetworksService } from '../../../devices/networks/shared/networks.service';
import { CharacteristicsService } from '../../../metadata/characteristics/shared/characteristics.service';
import { PipelineRegistryService } from '../../../data/pipeline-registry/shared/pipeline-registry.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { AuthorizationServiceMock } from '../../../../core/services/authorization.service.mock';

/* The copy of a deployment of a gateway opens on that gateway (SNRGY-3346). */
describe('ProcessDeploymentsConfigComponent copy', () => {
    let v2getDeployments: jasmine.Spy;
    let getPipelines: jasmine.Spy;

    function create(queryParams: { [key: string]: string }): ProcessDeploymentsConfigComponent {
        v2getDeployments = jasmine.createSpy('v2getDeployments').and.callFake(() => of({ id: 'd1', name: 'Fog', elements: [], diagram: { xml_deployed: '', svg: '' } }));
        getPipelines = jasmine.createSpy('getPipelines').and.returnValue(of([]));
        TestBed.configureTestingModule({
            providers: [
                { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
                { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                { provide: ProcessRepoService, useValue: {} },
                { provide: UtilService, useValue: {} },
                { provide: DeploymentsService, useValue: { v2getDeployments } },
                { provide: FlowRepoService, useValue: { getFlows: () => of({ flows: [] }) } },
                { provide: OperatorRepoService, useValue: { getAllOperators: () => of({ operators: [] }) } },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([{ id: 'hub-1', name: 'Gateway', device_local_ids: [] }]) } },
                { provide: CharacteristicsService, useValue: {} },
                { provide: PipelineRegistryService, useValue: { getPipelines } },
                { provide: AuthorizationService, useClass: AuthorizationServiceMock },
            ],
        });
        TestBed.overrideComponent(ProcessDeploymentsConfigComponent, { set: { template: '', imports: [] } });
        const fixture = TestBed.createComponent(ProcessDeploymentsConfigComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('selects the gateway the copied deployment runs on and loads the copy once, without cloud pipelines', () => {
        const component = create({ deploymentId: 'd1', hubId: 'hub-1' });
        expect(component.selectedHubForm.value?.id).toBe('hub-1');
        expect(v2getDeployments).toHaveBeenCalledOnceWith('d1');
        expect(getPipelines).not.toHaveBeenCalled();
        expect(component.deployment?.id).toBe('');
        expect(component.ready).toBeTrue();
    });

    it('starts a copy of a cloud deployment in the cloud', () => {
        const component = create({ deploymentId: 'd1' });
        expect(component.selectedHubForm.value).toBeNull();
        expect(v2getDeployments).toHaveBeenCalledOnceWith('d1');
        expect(component.ready).toBeTrue();
    });

    it('starts the copy in the cloud when the gateway is not among those of the user any more', () => {
        const component = create({ deploymentId: 'd1', hubId: 'gone' });
        expect(component.selectedHubForm.value).toBeNull();
        expect(v2getDeployments).toHaveBeenCalledOnceWith('d1');
        expect(component.ready).toBeTrue();
    });
});
