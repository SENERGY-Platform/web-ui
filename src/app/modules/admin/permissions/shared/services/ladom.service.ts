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
import {BehaviorSubject, Observable, ReplaySubject} from 'rxjs';
import { AllowedMethods, AuthorizationRequest, AuthorizationRequestResponse, PermissionApiModel, permissionApiToPermission, PermissionModel, PermissionTestResponse, permissionToPermissionApi } from '../permission.model';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root',
})
export class LadonService {

    public baseUrl: string = environment.ladonUrl;

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



    public checkUserHasReadAuthorization(targetURI: string): Observable<boolean> {
        return new Observable(obs => {
            var request: AuthorizationRequest = {'endpoint': targetURI, 'method': "GET"}
            this.userIsAuthorized([request]).subscribe((authResponse: AuthorizationRequestResponse) => {
                if(authResponse.allowed[0]) {
                    obs.next(true)
                } else {
                    obs.next(false)
                }
                obs.complete()
            })
        })
    }

    public getUserAuthorizationsForURI(targetURI: string, methods: AllowedMethods[]): Observable<PermissionTestResponse> {
        return new Observable(obs => {
            var requests: AuthorizationRequest[] = []
            methods.forEach(method => {
                var endpoint = new URL(targetURI).pathname
                requests.push({'endpoint': endpoint, 'method': method})
            });
            this.userIsAuthorized(requests).subscribe((authResponse: AuthorizationRequestResponse) => {
                var result: PermissionTestResponse = {
                    "GET": true,
                    "POST": false,
                    "DELETE": false,
                    "PUT": false,
                    "PATCH": false,
                    "HEAD": true,
                }

                methods.forEach(function(method, methodIndex) {
                    result[method] = authResponse.allowed[methodIndex]
                });
                obs.next(result)
                obs.complete()
            })
        })
    }

    
    /*

    USE THIS IN A SERVICE TO WAIT FOR PERMISSIONS 
    THEN ACCESS allPermissions TO GET RULES PER METHOD FOR A URL

    authorizationForMethodsOfURI: PermissionTestResponse = {"GET": true, "DELETE": false, "HEAD": true, "PATCH": false, "POST": false, "PUT": false} 
    authorizationObs: Observable<Record<string, PermissionTestResponse>> = new Observable()

    constructor(
        private http: HttpClient, 
        private ladonService: LadonService
    ) {
        this.authorizationObs = this.ladonService.checkAllServiceEndpoints()
        this.authorizationObs.subscribe((allPermissions: Record<string, PermissionTestResponse>) => {
            this.authorizationForMethodsOfURI = allPermissions[environment.swaggerUrl]
        })
    }

    USE THIS HERE TO LOAD ALL PERMISSIONS AT ONCE 

    private allServiceEndpointsObservable: ReplaySubject<Record<string, PermissionTestResponse>> = new ReplaySubject()

    public checkAllServiceEndpoints(): Observable<Record<string, PermissionTestResponse>> {
        return this.allServiceEndpointsObservable.asObservable();
    }

    private checkAllServiceEndpointAuthorizations(){
        var requests: AuthorizationRequest[] = []
        var methods: AllowedMethods[] = ["GET", "DELETE", "POST", "PUT", "PATCH"]
            
        var serviceEndpoints = [
                environment.flowRepoUrl,
                environment.flowEngineUrl,
                environment.flowParserUrl,
                environment.permissionSearchUrl,
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
                environment.deviceManagerUrl,
                environment.processIoUrl,
                environment.dashboardServiceUrl
        ]
            
        serviceEndpoints.forEach(endpointURL => {
                var endpoint = new URL(endpointURL).pathname

                methods.forEach(method => {
                    requests.push({'endpoint': endpoint, 'method': method})
                });
        })

        this.userIsAuthorized(requests).subscribe((authResponse: AuthorizationRequestResponse) => {
                var allRules: Record<string, PermissionTestResponse> = {}
                serviceEndpoints.forEach((endpointURL, endpointIndex) => {
                    allRules[endpointURL] = {
                        "GET": true,
                        "POST": false,
                        "DELETE": false,
                        "PUT": false,
                        "PATCH": false,
                        "HEAD": true,
                    }

                    methods.forEach(function(method, methodIndex) {
                        var indexOfEndpointMethodRule = endpointIndex * 6 + methodIndex
                        allRules[endpointURL][method] = authResponse.allowed[indexOfEndpointMethodRule]
                    });
                })

                console.log(allRules)
                this.allServiceEndpointsObservable.next(allRules)
                this.allServiceEndpointsObservable.complete()
        })
    }
    */
}
