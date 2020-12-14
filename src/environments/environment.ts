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
    processSchedulerUrl: 'http://localhost',
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
    deviceSelectionUrl: 'http://localhost',
    ubaUrl: 'http://localhost',
    dwdOpenUrl: 'http://localhost',
    geonamesUrl: 'http://localhost',
    yrUrl: 'http://localhost',
    notificationsUrl: 'http://localhost',
    configurablesUrl: 'http://localhost',
    /** Semantic Keys **/
    timeStampCharacteristicId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixSecondsId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixNanoSecondsId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    mqttProtocolID: 'urn:infai:ses:protocol:xx-xxxx-xxxx-xxxx-xxxxx',
    getPm1FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPm10FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPm25FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getHumidityFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getTemperatureFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPressureFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getCo2FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    aspectAirId: 'urn:infai:ses:aspect:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importRepoUrl: 'http://localhost',
    importDeployUrl: 'http://localhost',
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
