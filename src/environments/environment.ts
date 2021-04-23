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

const env = (window as any)['env'] || {};

export const environment = {
    production: false,
    keyCloakRealm: env.keyCloakRealm || 'master',
    keyCloakClientId: env.keyCloakClientId || 'frontend',
    keycloakUrl: env.keycloakUrl || 'http://localhost',
    /** URLs **/
    processDeploymentUrl: env.processDeploymentUrl || 'http://localhost',
    processServiceUrl: env.processServiceUrl || 'http://localhost',
    processRepoUrl: env.processRepoUrl || 'http://localhost',
    processIncidentApiUrl: env.processIncidentApiUrl || 'http://localhost',
    processSchedulerUrl: env.processSchedulerUrl || 'http://localhost',
    operatorRepoUrl: env.operatorRepoUrl || 'http://localhost',
    exportService: env.exportService || 'http://localhost',
    influxAPIURL: env.influxAPIURL || 'http://localhost',
    pipelineRegistryUrl: env.pipelineRegistryUrl || 'http://localhost',
    flowRepoUrl: env.flowRepoUrl || 'http://localhost',
    flowEngineUrl: env.flowEngineUrl || 'http://localhost',
    flowParserUrl: env.flowParserUrl || 'http://localhost',
    permissionSearchUrl: env.permissionSearchUrl || 'http://localhost',
    permissionCommandUrl: env.permissionCommandUrl || 'http://localhost',
    apiAggregatorUrl: env.apiAggregatorUrl || 'http://localhost',
    iotRepoUrl: env.iotRepoUrl || 'http://localhost',
    dashboardServiceUrl: env.dashboardServiceUrl || 'http://localhost',
    usersServiceUrl: env.usersServiceUrl || 'http://localhost',
    deviceRepoUrl: env.deviceRepoUrl || 'http://localhost',
    deviceManagerUrl: env.deviceManagerUrl || 'https://localhost',
    semanticRepoUrl: env.semanticRepoUrl || 'https://localhost',
    deviceSelectionUrl: env.deviceSelectionUrl || 'http://localhost',
    ubaUrl: env.ubaUrl || 'http://localhost',
    dwdOpenUrl: env.dwdOpenUrl || 'http://localhost',
    geonamesUrl: env.geonamesUrl || 'http://localhost',
    yrUrl: env.yrUrl || 'http://localhost',
    notificationsUrl: env.notificationsUrl || 'http://localhost',
    notificationsWebsocketUrl: env.notificationsWebsocketUrl || 'ws://localhost',
    configurablesUrl: env.configurablesUrl || 'http://localhost',
    marshallerUrl: env.marshallerUrl || 'http://localhost',
    /** Semantic Keys **/
    timeStampCharacteristicId: env.timeStampCharacteristicId || 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixSecondsId: env.timeStampCharacteristicUnixSecondsId || 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixNanoSecondsId: env.timeStampCharacteristicUnixNanoSecondsId || 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixMilliSecondsId: env.timeStampCharacteristicUnixMilliSecondsId || 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    mqttProtocolID: env.mqttProtocolID || 'urn:infai:ses:protocol:xx-xxxx-xxxx-xxxx-xxxxx',
    getPm1FunctionId: env.getPm1FunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPm10FunctionId: env.getPm10FunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPm25FunctionId: env.getPm25FunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getHumidityFunctionId: env.getHumidityFunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getTemperatureFunctionId: env.getTemperatureFunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPressureFunctionId: env.getPressureFunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getCo2FunctionId: env.getCo2FunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getTimestampFunctionId: env.getTimestampFunctionId || 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    aspectAirId: env.aspectAirId || 'urn:infai:ses:aspect:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importRepoUrl: env.importRepoUrl || 'http://localhost',
    importDeployUrl: env.importDeployUrl || 'http://localhost',
    importTypeIdUbaStation: env.importTypeIdUbaStation || 'urn:infai:ses:import-type:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importTypeIdDwdPollen: env.importTypeIdDwdPollen || 'urn:infai:ses:import-type:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importTypeIdYrForecast: env.importTypeIdYrForecast || 'urn:infai:ses:import-type:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    processFogDeploymentUrl: env.processFogDeploymentUrl || 'http://localhost',
    processSyncUrl: env.processSyncUrl || 'http://localhost',
    equivalentProtocolSegments: env.equivalentProtocolSegments || '[]',
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
