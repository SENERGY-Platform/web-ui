/*
 *
 *     Copyright 2018 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import { AllowedMethods, AuthorizationRequest, AuthorizationRequestResponse, PermissionApiModel, permissionApiToPermission, PermissionModel, PermissionTestResponse, permissionToPermissionApi } from '../permission.model';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';


@Injectable({
    providedIn: 'root',
})
export class LadonService {

    public baseUrl: string = environment.ladonUrl;
    private authorizationsPerURL: Record<string, PermissionTestResponse> = {}

    constructor(
        private http: HttpClient
    ) {
    }

    private static handlePolicies(policies: PermissionModel[]): PermissionApiModel[] {
        const apiPolicies: PermissionApiModel[] = [];
        for (const policy of policies) {
            if (!policy.id) {
                policy.id = policy.subject + '-' + policy.resource;
            }
            apiPolicies.push(permissionToPermissionApi(policy));
        }
        return apiPolicies;
    }

    public postPolicies(policies: PermissionModel[]): Observable<unknown> {
        return this.http.post(this.baseUrl + '/policies', LadonService.handlePolicies(policies));
    }

    public putPolicies(policies: PermissionModel[]): Observable<unknown> {
        return this.http.put(this.baseUrl + '/policies', LadonService.handlePolicies(policies));
    }

    public getAllPolicies(): Observable<PermissionModel[]> {
        return new Observable<PermissionModel[]>((obs) => {
            this.http.get(this.baseUrl + '/policies').subscribe((policies) => {
                const apiModels = policies as PermissionApiModel[];
                const models: PermissionModel[] = [];
                apiModels.forEach((policy) => models.push(permissionApiToPermission(policy)));
                obs.next(models);
                obs.complete();
            });
        });
    }

    public deletePolicies(policies: PermissionModel[]): Observable<unknown> {
        const ids: string[] = [];
        policies.forEach((p) => ids.push(p.id));
        return this.http.request('delete', this.baseUrl + '/policies', {body: ids});
    }

    public test(test: { clientID: string; userId: string; roles: string[]; username: string; target_method: string; target_uri: string }):
        Observable<PermissionTestResponse> {

        return this.http.post
            < {GET: boolean; POST: boolean; PUT: boolean; PATCH: boolean; DELETE: boolean; HEAD: boolean} > (this.baseUrl + '/test', test);
    }

    public userIsAuthorized(requests: AuthorizationRequest[]): Observable<AuthorizationRequestResponse> {
        return this.http.post<AuthorizationRequestResponse>(this.baseUrl + '/allowed', requests);
    }

    public getUserAuthorizationsForURI(targetURI: string): PermissionTestResponse {
        return this.authorizationsPerURL[targetURI]
    }

    public checkAllServiceEndpointAuthorizations(ladonUrl: string): Promise<boolean> {
        this.baseUrl = ladonUrl

        var requests: AuthorizationRequest[] = []
        var methods: AllowedMethods[] = ["GET", "DELETE", "POST", "PUT", "PATCH"]
        
        var ServiceEndpoints = [
            environment.flowRepoUrl,
            environment.flowEngineUrl,
            environment.flowParserUrl,
        
            environment.permissionSearchUrl,
            environment.permissionSearchUrl + '/v3/resources/characteristics',
            environment.permissionSearchUrl + '/v3/resources/device-classes',
            environment.permissionSearchUrl + '/v3/resources/functions',
            environment.permissionSearchUrl + '/v3/resources/concepts',
            environment.permissionSearchUrl + '/v3/resources/device-types',
        
            environment.apiAggregatorUrl,
            environment.deviceRepoUrl,
            environment.iotRepoUrl,
            environment.permissionCommandUrl,
            environment.operatorRepoUrl,
            environment.smartServiceRepoUrl,
            environment.processDeploymentUrl,
            environment.processServiceUrl,
            environment.processRepoUrl,
            environment.processIncidentApiUrl,
            environment.processSchedulerUrl,
            environment.operatorRepoUrl,
            environment.exportService,
            environment.brokerExportServiceUrl,
            environment.pipelineRegistryUrl,
            environment.swaggerUrl,
            environment.importDeployUrl,
            environment.importRepoUrl,
        
            environment.deviceRepoUrl,
            environment.deviceRepoUrl + '/aspects',
        
            environment.deviceManagerUrl,
            environment.deviceManagerUrl + '/device-types',
        
            environment.processIoUrl,
            environment.dashboardServiceUrl + '/dashboards',
            environment.dashboardServiceUrl + '/widgets',
            environment.dashboardServiceUrl + '/widgets/name',
            environment.dashboardServiceUrl + '/widgets/properties',
            environment.usersServiceUrl,
            environment.notificationsUrl,
            environment.waitingRoomUrl,
            environment.costApiUrl,
            environment.costApiUrl + '/estimation/flow',
            environment.billingApiUrl + '/billing-components',
        ]
        
        ServiceEndpoints.forEach(endpointURL => {
                var endpoint = new URL(endpointURL).pathname

                methods.forEach(method => {
                    requests.push({'endpoint': endpoint, 'method': method})
                });
        })

        return new Promise((resolve, _) => {
            this.userIsAuthorized(requests).subscribe(authResponse => {
                  var allRules: Record<string, PermissionTestResponse> = {}
                  ServiceEndpoints.forEach((endpointURL, endpointIndex) => {
                      allRules[endpointURL] = {
                          "GET": true,
                          "POST": false,
                          "DELETE": false,
                          "PUT": false,
                          "PATCH": false,
                          "HEAD": true,
                      }
              
                      methods.forEach(function(method, methodIndex) {
                          var indexOfEndpointMethodRule = endpointIndex * 5 + methodIndex
                          allRules[endpointURL][method] = authResponse.allowed[indexOfEndpointMethodRule]
                      });
                  })
              
                  this.authorizationsPerURL = allRules
                  resolve(true)
                })
        }) 
    }
    
}