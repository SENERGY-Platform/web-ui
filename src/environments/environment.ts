/*
 * Copyright 2018 InfAI (CC SES)
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

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    keyCloakRealm: 'master',
    keyCloakClientId: 'frontend',
    keycloakUrl: 'http://localhost',
    /** URLs **/
    processDeploymentUrl: 'http://localhost',
    processServiceUrl: 'http://localhost',
    processRepoUrl: 'http://localhost',
    processIncidentApiUrl: 'http://localhost',
    operatorRepoUrl: 'http://localhost',
    exportService: 'http://localhost',
    influxAPIURL: 'http://localhost',
    pipelineRegistryUrl: 'http://localhost',
    flowRepoUrl: 'http://localhost',
    flowEngineUrl: 'http://localhost',
    flowParserUrl: 'http://localhost',
    permissionSearchUrl: 'http://localhost',
    permissionCommandUrl: 'http://localhost',
    apiAggregatorUrl: 'http://localhost',
    iotRepoUrl: 'http://localhost',
    dashboardServiceUrl: 'http://localhost',
    usersServiceUrl: 'http://localhost',
    deviceRepoUrl: 'http://localhost',
    deviceManagerUrl: 'https://localhost',
    semanticRepoUrl: 'https://localhost',
    ubaUrl: 'http://localhost',
    dwdOpenUrl: 'http://localhost',
    geonamesUrl: 'http://localhost',
    yrUrl: 'http://localhost',
    notificationsUrl: 'http://localhost',
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
