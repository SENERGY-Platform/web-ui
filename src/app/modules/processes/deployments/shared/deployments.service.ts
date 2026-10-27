/*
 * Copyright 2020 InfAI (CC SES)
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { forkJoin, Observable, of, timer } from 'rxjs';
import { catchError, concatMap, map, mergeMap, retryWhen } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DeploymentDependenciesModel, DeploymentsModel, ProcessStartParameter } from './deployments.model';
import { CamundaVariable } from './deployments-definition.model';
import { DeploymentsMissingDependenciesModel } from './deployments-missing-dependencies.model';
import {
    DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedConfigurableModel,
    V2DeploymentsPreparedModel
} from './deployments-prepared-v2.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { AutomationEngineService } from '../../../../core/services/automation-engine.service';
import { EngineDeployment, EngineNetwork } from '../../../../core/model/automation-engine.model';
import { DeploymentsFogMetadataModel } from './deployments-fog.model';

@Injectable({
    providedIn: 'root',
})
export class DeploymentsService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
        private automationEngineService: AutomationEngineService,
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.processServiceUrl);
    }

    getStartParameter(modelId: string): Observable<ProcessStartParameter[]> {
        return this.http
            .get<ProcessStartParameter[]>(environment.processDeploymentUrl + '/v3/start-parameters/' + encodeURIComponent(modelId))
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getStartParameter', [])));
    }

    getAll(query: string, limit: number, offset: number, feature: string, order: string, source: string): Observable<DeploymentsModel[]> {
        return this.list(query, limit, offset, feature, order, source);
    }

    list(query: string, limit: number, offset: number, feature: string, order: string, source: string): Observable<DeploymentsModel[]> {
        return this.getAllMinimal(query, limit, offset, feature, order, source).pipe(
            concatMap((result) => this.completeOnlineState(result)),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getAll', [])),
        );
    }

    /**
     * Deployments of the platform and of the gateways, read from the engine, because the routes of the
     * old services list either the platform or one gateway. networkId undefined lists all,
     * ENGINE_CLOUD_NETWORK those of the platform and a hub id those of that hub.
     */
    listOfNetworks(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
        source: string,
        networkId?: string,
    ): Observable<DeploymentsModel[]> {
        const sort = (feature === 'deploymentTime' ? 'created_at' : feature) + '.' + order;
        return this.automationEngineService
            .listDeployments({ search: query, limit, offset, sort, source, network_id: networkId })
            .pipe(
                concatMap((page) => this.completeEngineDeployments(page.items || [])),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'listOfNetworks', [])),
            );
    }

    /** a deployment of the platform or of a gateway, as listOfNetworks lists it */
    getDeploymentOfNetworks(id: string): Observable<DeploymentsModel | null> {
        return this.automationEngineService.getDeployment(id).pipe(
            concatMap((deployment) => this.completeEngineDeployments([deployment])),
            map((deployments) => deployments[0] || null),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeploymentOfNetworks', null)),
        );
    }

    /**
     * Diagram, and the state of devices or hub: a deployment of the platform is offline while one of its
     * devices is, one of a hub while the hub is. A hub deployment also waits for sync until the hub
     * applied it. A failing part leaves the deployments as they are instead of emptying the list.
     */
    private completeEngineDeployments(items: EngineDeployment[]): Observable<DeploymentsModel[]> {
        const deployments = items.map(
            (d) =>
                ({
                    id: d.id,
                    name: d.name,
                    definition_id: d.id,
                    deploymentTime: d.created_at,
                    diagram: '',
                    disabled: d.disabled === true,
                    network_id: d.network_id || undefined,
                    online: true,
                    offline_reasons: [],
                    sync: false,
                }) as unknown as DeploymentsModel,
        );
        if (deployments.length === 0) {
            return of(deployments);
        }
        const platform = deployments.filter((d) => !d.network_id);
        const networkIds = deployments.map((d) => d.network_id).filter((id, i, a): id is string => !!id && a.indexOf(id) === i);
        return forkJoin([
            forkJoin(deployments.map((d) => this.getDiagramSvg(d.id))),
            this.completeOnlineState(platform).pipe(catchError(() => of(platform))),
            networkIds.length === 0
                ? of([] as (EngineNetwork | null)[])
                : forkJoin(networkIds.map((id) => this.automationEngineService.getNetwork(id).pipe(catchError(() => of(null))))),
        ]).pipe(
            map(([diagrams, _, networks]) => {
                deployments.forEach((d, i) => (d.diagram = diagrams[i]));
                deployments.forEach((d) => {
                    const network = networks.find((n) => n?.id === d.network_id);
                    if (network) {
                        applyNetworkState(d, network);
                    }
                });
                return deployments;
            }),
        );
    }

    /** the SVG of the current version; the route of the old engine answers it without the BPMN */
    private getDiagramSvg(deploymentId: string): Observable<string> {
        return this.http
            .get(environment.processServiceUrl + '/v2/process-definitions/' + encodeURIComponent(deploymentId) + '/diagram', {
                responseType: 'text',
            })
            .pipe(catchError(() => of('')));
    }

    private completeOnlineState(deployments: DeploymentsModel[]): Observable<DeploymentsModel[]> {
        if (deployments.length === 0) {
            return of(deployments);
        }
        const deploymentIds = deployments.map((deployment) => deployment.id);
        return this.getDependenciesList(deploymentIds).pipe(
            concatMap((dependencies) => {
                const unique = (v: string, i: number, a: string[]) => a.indexOf(v) === i;
                const deviceIds = dependencies
                    .flatMap((dependency) => (dependency.devices || []).map((device) => device.device_id))
                    .filter(unique);
                return this.getCurrentDeviceStates(deviceIds).pipe(
                    map((deviceStates) => {
                        const dependenciesIndex = new Map<string, DeploymentDependenciesModel>();
                        dependencies.forEach((dependency) => dependenciesIndex.set(dependency.deployment_id, dependency));
                        deployments.forEach((deployment) => {
                            // event dependencies are not checked and count as online
                            deployment.online = true;
                            deployment.offline_reasons = [];
                            (dependenciesIndex.get(deployment.id)?.devices || []).forEach((device) => {
                                if ((deviceStates.get(device.device_id) || []).includes(false)) {
                                    deployment.online = false;
                                    deployment.offline_reasons.push({
                                        type: 'device-offline',
                                        id: device.device_id,
                                        additional_info: { name: device.name },
                                        description: 'device ' + device.name + ' is offline',
                                    });
                                }
                            });
                        });
                        return deployments;
                    }),
                );
            }),
        );
    }

    private getDependenciesList(deploymentIds: string[]): Observable<DeploymentDependenciesModel[]> {
        return this.http
            .get<DeploymentDependenciesModel[]>(
                environment.processDeploymentUrl + '/dependencies?ids=' + deploymentIds.map(encodeURIComponent).join(','),
            )
            .pipe(map((resp) => resp || []));
    }

    private getCurrentDeviceStates(deviceIds: string[]): Observable<Map<string, boolean[]>> {
        if (deviceIds.length === 0) {
            return of(new Map<string, boolean[]>());
        }
        return this.http.post<any>(environment.connectionLogUrl + '/current/query/map-original', { ids: deviceIds }).pipe(
            map((obj) => {
                const m = new Map<string, boolean[]>();
                for (const key of Object.keys(obj || {})) {
                    m.set(key, obj[key]);
                }
                return m;
            }),
        );
    }

    getAllMinimal(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
        source: string,
    ): Observable<DeploymentsModel[]> {
        let url =
            environment.processServiceUrl +
            '/v2/deployments?sortBy=' +
            feature +
            '&sortOrder=' +
            order +
            '&maxResults=' +
            limit +
            '&firstResult=' +
            offset;
        if (query) {
            url += '&nameLike=' + encodeURIComponent('%' + query + '%');
        }
        if (source) {
            url += '&source=' + encodeURIComponent(source);
        }
        return this.http.get<DeploymentsModel[]>(url).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getAll', [])),
        );
    }

    getDeploymentName(deploymentId: string): Observable<string> {
        return this.http.get<DeploymentsModel>(environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(deploymentId)).pipe(
            map((resp) => (resp && resp.name) || ''),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeploymentName', '')),
        );
    }

    getMissingDependencies(id: string): Observable<DeploymentsMissingDependenciesModel | null> {
        return this.http
            .get<DeploymentsMissingDependenciesModel>(environment.processDeploymentUrl + '/dependencies/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getMissingDependencies', null)));
    }

    startDeployment(deploymentId: string): Observable<any | null> {
        return this.http
            .get<any>(environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(deploymentId) + '/start')
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'startDeployment', null)));
    }

    setDeploymentDisabled(deploymentId: string, disabled: boolean): Observable<{ disabled: boolean } | null> {
        return this.http
            .put<{ disabled: boolean }>(environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(deploymentId) + '/disabled', {
                disabled,
            })
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'setDeploymentDisabled', null)));
    }

    getDeploymentInputParameters(deploymentId: string): Observable<Map<string, CamundaVariable> | null> {
        return this.http
            .get<Map<string, CamundaVariable>>(
                environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(deploymentId) + '/parameter',
            )
            .pipe(
                map((resp) => {
                    if (!resp) {
                        return resp;
                    } else if (resp instanceof Map) {
                        return resp;
                    } else {
                        return new Map<string, CamundaVariable>(Object.entries(resp));
                    }
                }),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getProcessParameters', null)),
            );
    }

    startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null> {
        const queryParts: string[] = [];
        parameter.forEach((value, key) => {
            queryParts.push(key + '=' + encodeURIComponent(JSON.stringify(value.value)));
        });
        return this.http.get<any>(
            environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(deploymentId) + '/start?' + queryParts.join('&'),
        );
    }

    v2deleteDeployment(deploymentId: string): Observable<{ status: number }> {
        return this.http
            .delete(environment.processDeploymentUrl + '/v3/deployments/' + encodeURIComponent(deploymentId), {
                responseType: 'text',
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v2deleteDeployment', { status: 500 })),
            );
    }

    /** with a networkId the options are those for that hub */
    getPreparedDeployments(processId: string, networkId?: string): Observable<V2DeploymentsPreparedModel | null> {
        const url = networkId
            ? environment.processFogDeploymentUrl + '/prepared-deployments/' + encodeURIComponent(networkId) + '/' + encodeURIComponent(processId)
            : environment.processDeploymentUrl + '/v3/prepared-deployments/' + processId;
        return this.http.get<V2DeploymentsPreparedModel>(url).pipe(
            catchError(this.errorHandlerService.handleErrorWithSnackBar('Error: unable to load prepared process deployment', DeploymentsService.name, 'getPreparedDeployments', null)),
            map((deployment) => {
                deployment?.elements?.forEach((element) => {
                    element.message_event?.selection?.selection_options?.forEach((option: any) => {
                        if (option.path_options === undefined) {
                            return;
                        }
                        const m = new Map<string, DeploymentsSelectionPathOptionModel[]>();
                        for (const key of Object.keys(option.path_options)) {
                            m.set(key, option.path_options[key]);
                        }
                        option.path_options = m;
                    });
                    element.task?.selection?.selection_options?.forEach((option: any) => {
                        if (option.path_options === undefined) {
                            return;
                        }
                        const m = new Map<string, DeploymentsSelectionPathOptionModel[]>();
                        for (const key of Object.keys(option.path_options)) {
                            m.set(key, option.path_options[key]);
                        }
                        option.path_options = m;
                    });
                });
                return deployment;
            }),
        );
    }

    v2getPreparedDeploymentsByXml(xml: string, svg: string): Observable<V2DeploymentsPreparedModel | null> {
        return this.http
            .post<V2DeploymentsPreparedModel>(environment.processDeploymentUrl + '/v3/prepared-deployments', { xml, svg })
            .pipe(catchError(this.errorHandlerService.handleErrorWithSnackBar('Error: unable to load prepared process deployment', DeploymentsService.name, 'getPreparedDeployments', null)));
    }

    v2getDeployments(deploymentId: string): Observable<V2DeploymentsPreparedModel | null> {
        return this.http
            .get<V2DeploymentsPreparedModel>(environment.processDeploymentUrl + '/v3/deployments/' + deploymentId)
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v2getDeployments', null)));
    }

    /**
     * The deployed bpmn of a single deployment. Selection options are left out, only the diagram is
     * read from the response.
     */
    getDeploymentDiagramXml(deploymentId: string): Observable<string> {
        return this.http
            .get<V2DeploymentsPreparedModel>(
                environment.processDeploymentUrl + '/v3/deployments/' + encodeURIComponent(deploymentId) + '?with_options=false',
            )
            .pipe(
                map((deployment) => deployment?.diagram?.xml_deployed || deployment?.diagram?.xml_raw || ''),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeploymentDiagramXml', '')),
            );
    }

    v3getAllDeployments(): Observable<V2DeploymentsPreparedModel[]> {
        return this.http.get<V2DeploymentsPreparedModel[] | null>(environment.processDeploymentUrl + '/v3/deployments').pipe(
            map(r => r || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v3getDeployments', [])),
        );
    }

    /** the deployments of a hub in the format of v3getAllDeployments, which lists only those of the platform */
    getAllNetworkDeployments(networkId: string): Observable<V2DeploymentsPreparedModel[]> {
        return this.http.get<DeploymentsFogMetadataModel[] | null>(environment.processSyncUrl + '/metadata/' + encodeURIComponent(networkId)).pipe(
            map((metadata) => (metadata || []).map((m) => m.deployment_model)),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getAllNetworkDeployments', [])),
        );
    }

    // deprecated
    getConfigurables(characteristicId: string, serviceId: string): Observable<V2DeploymentsPreparedConfigurableModel[] | null> {
        return this.http
            .get<V2DeploymentsPreparedConfigurableModel[]>(
                environment.configurablesUrl + '?characteristicId=' + characteristicId + '&serviceIds=' + serviceId,
            )
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getConfigurables', null)));
    }

    /** with a networkId the deployment runs on that hub */
    v2postDeployments(deployment: V2DeploymentsPreparedModel, source: string = 'sepl', networkId?: string): Observable<{ status: number; id: string }> {
        const url = networkId
            ? environment.processFogDeploymentUrl + '/deployments/' + encodeURIComponent(networkId) + '?source=' + source
            : environment.processDeploymentUrl + '/v3/deployments?source=' + source;
        return this.http
            .post<V2DeploymentsPreparedModel>(url, deployment, {
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status, id: resp.body ? resp.body.id : '' })),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v2postDeployments', { status: 500, id: '' })),
            );
    }

    checkForDeletedDeploymentWithRetries(id: string, maxRetries: number, intervalInMs: number): Observable<boolean> {
        return this.http.get<boolean>(environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(id) + '/exists').pipe(
            map((data) => {
                if (data === true) {
                    throw Error('');
                }
                return data;
            }),
            retryWhen(
                mergeMap((error, i) => {
                    const retryAttempt = i + 1;
                    if (retryAttempt > maxRetries) {
                        throw error;
                    }
                    return timer(retryAttempt * intervalInMs);
                }),
            ),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'checkForProcessModelWithRetries', true)),
        );
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}

/**
 * A hub that is offline makes its deployments offline. A deployment the hub has not applied yet waits
 * for sync, one it could not apply is offline with the error of the hub.
 */
function applyNetworkState(deployment: DeploymentsModel, network: EngineNetwork): void {
    const name = network.name || network.id;
    if (!network.online) {
        deployment.online = false;
        deployment.offline_reasons.push({
            id: network.id,
            type: 'network_offline',
            description: name + ' offline',
            additional_info: { name },
        });
    }
    const resource = (network.resources || []).find((r) => r.kind === 'deployment' && r.id === deployment.id);
    if (resource?.state === 'pending') {
        deployment.sync = true;
    }
    if (resource?.state === 'failed') {
        deployment.online = false;
        deployment.offline_reasons.push({
            id: network.id,
            type: 'network_failed',
            description: name + ' could not apply the deployment' + (resource.error ? ': ' + resource.error : ''),
            additional_info: { name },
        });
    }
}
