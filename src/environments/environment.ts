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
    keyCloakConfidential: env.keyCloakConfidential || 'false',
    keycloakUrl: env.keycloakUrl || 'http://localhost',
    configUrl: env.configUrl || 'http://localhost',
    theme: env.theme || 'senergy',
    title: env.title || 'SENERGY',
    commit: env.commit || '',
    version: env.version || '',
    /** URLs **/
    processIoUrl: '',
    smartServiceRepoUrl: '',
    processDeploymentUrl: 'http://localhost',
    processServiceUrl: 'http://localhost',
    processRepoUrl: 'http://localhost',
    processIncidentApiUrl: 'http://localhost',
    processSchedulerUrl: 'http://localhost',
    operatorRepoUrl: 'http://localhost',
    exportService: 'http://localhost',
    brokerExportServiceUrl: 'http://localhost',
    brokerExportBroker: 'localhost:1883',
    influxAPIURL: 'http://localhost',
    timescaleAPIURL: 'http://localhost',
    timescaleAPIDownloadURL: 'http://localhost',
    pipelineRegistryUrl: 'http://localhost',
    flowRepoUrl: 'http://localhost',
    flowEngineUrl: 'http://localhost',
    flowParserUrl: 'http://localhost',
    apiAggregatorUrl: 'http://localhost',
    iotRepoUrl: 'http://localhost',
    dashboardServiceUrl: 'http://localhost',
    usersServiceUrl: 'http://localhost',
    deviceRepoUrl: 'http://localhost',
    deviceSelectionUrl: 'http://localhost',
    ubaUrl: 'http://localhost',
    dwdOpenUrl: 'http://localhost',
    geonamesUrl: 'http://localhost',
    yrUrl: 'http://localhost',
    notificationsUrl: 'http://localhost',
    notificationsWebsocketUrl: 'ws://localhost',
    configurablesUrl: 'http://localhost',
    marshallerUrl: 'http://localhost',
    waitingRoomUrl: 'http://localhost',
    waitingRoomWsUrl: '',
    deviceCommandUrl: 'http://localhost',
    /** Semantic Keys **/
    timeStampCharacteristicId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixSecondsId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixNanoSecondsId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    timeStampCharacteristicUnixMilliSecondsId: 'urn:infai:ses:characteristic:xxxxxx-xxxx-xxxxx-xxxx',
    mqttProtocolID: 'urn:infai:ses:protocol:xx-xxxx-xxxx-xxxx-xxxxx',
    getPm1FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPm10FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPm25FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getHumidityFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getTemperatureFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getPressureFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getCo2FunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getTimestampFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    aspectAirId: 'urn:infai:ses:aspect:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importRepoUrl: 'http://localhost',
    importDeployUrl: 'http://localhost',
    importTypeIdUbaStation: 'urn:infai:ses:import-type:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importTypeIdDwdPollen: 'urn:infai:ses:import-type:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    importTypeIdYrForecast: 'urn:infai:ses:import-type:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    processFogDeploymentUrl: 'http://localhost',
    processSyncUrl: 'http://localhost',
    equivalentProtocolSegments: '[]',
    exportDatabaseIdInternalInfluxDb: 'urn:infai:ses:export-db:ac535dbb-4600-4b84-8660-2f40de034644',
    exportDatabaseIdInternalTimescaleDb: 'urn:infai:ses:export-db:6191c5d3-10ff-4899-bef9-3321ecea109c',
    getTargetTemperatureFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getCleaningRequiredFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getOnOffFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setOnFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setOffFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getAcModeFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setAcModeFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getLockedFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setUnlockedFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setLockedFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setTargetTemperatureFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getFanSpeedLevelFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setFanSpeedLevelFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getFanSpeedLevelAutomaticFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    setFanSpeedLevelAutomaticFunctionId: 'urn:infai:ses:controlling-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    getBatteryLevelFunctionId: 'urn:infai:ses:measuring-function:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    dateTimeConceptId: 'urn:infai:ses:concept:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    deviceClassThermostat: 'urn:infai:ses:device-class:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    ladonUrl: 'http://localhost',
    kongAdminProxyUrl: 'http://localhost',
    swaggerUrl: 'http://localhost',
    timescaleRuleManagerUrl: 'http://localhost',
    budgetApiUrl: 'http://localhost',
    costApiUrl: 'http://localhost',
    billingApiUrl: 'http://localhost',
    reportEngineUrl: 'http://localhost',
    permissionV2Url: 'http://localhost',
    connectionLogUrl: 'http://localhost',
    certAuthorityUrl: 'http://localhost',
    mockPermissionsV2: false,
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
