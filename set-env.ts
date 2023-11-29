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

// This is good for local dev environments, when it's better to
// store a projects environment variables in a .gitignore'd file
require('dotenv').config();

const fs = require('fs');
const yargs = require('yargs');

// Would be passed to script like this:
// `ts-node set-env.ts --environment=dev`
// we get it from yargs's argv object
const environment = yargs.argv.environment;
const isProd = environment === 'prod';

const targetPath = './src/environments/environment.' + environment + '.ts';
const envConfigFile = `
export const environment = {
  production: ${isProd},
  keyCloakRealm: '${process.env.KEYCLOACK_REALM}',
  keyCloakClientId: '${process.env.KEYCLOACK_CLIENT_ID}',
  keyConfidential: '${process.env.KEYCLOACK_CONFIDENTIAL}',
  keycloakUrl: '${process.env.KEYCLOACK_URL}',
  processIoUrl: '${process.env.PROCESS_IO_URL}',
  smartServiceRepoUrl: '${process.env.SMART_SERVICE_REPO_URL}',
  processRepoUrl: '${process.env.PROCESS_REPO_URL}',
  processDeploymentUrl: '${process.env.PROCESS_DEPLOYMENT_URL}',
  processServiceUrl: '${process.env.PROCESS_SERVICE_URL}',
  processIncidentApiUrl: '${process.env.PROCESS_INCIDENT_API_URL}',
  processSchedulerUrl: '${process.env.PROCESS_SCHEDULER_URL}',
  operatorRepoUrl: '${process.env.OPERATOR_REPO_URL}',
  exportService: '${process.env.EXPORT_SERVICE}',
  influxAPIURL: '${process.env.INFLUX_API_URL}',
  pipelineRegistryUrl: '${process.env.PIPELINE_REGISTRY_URL}',
  flowRepoUrl: '${process.env.FLOW_REPO_URL}',
  flowEngineUrl: '${process.env.FLOW_ENGINE_URL}',
  flowParserUrl: '${process.env.FLOW_PARSER_URL}',
  permissionSearchUrl: '${process.env.PERMISSION_SEARCH_URL}',
  permissionCommandUrl: '${process.env.PERMISSION_COMMAND_URL}',
  apiAggregatorUrl: '${process.env.API_AGGREGATOR_URL}',
  iotRepoUrl: '${process.env.IOT_REPO_URL}',
  dashboardServiceUrl: '${process.env.DASHBOARD_SERVICE_URL}',
  usersServiceUrl: '${process.env.USERS_SERVICE_URL}',
  deviceRepoUrl: '${process.env.DEVICE_REPO_URL}',
  deviceManagerUrl: '${process.env.DEVICE_MANAGER_URL}',
  deviceSelectionUrl: '${process.env.DEVICE_SELECTION_URL}',
  ubaUrl: '${process.env.UBA_URL}',
  dwdOpenUrl: '${process.env.DWD_OPEN_URL}',
  geonamesUrl: '${process.env.GEONAMES_URL}',
  yrUrl: '${process.env.YR_URL}',
  notificationsUrl: '${process.env.NOTIFICATION_SERVICE_URL}',
  notificationsWebsocketUrl: '${process.env.NOTIFICATION_SERVICE_WEBSOCKET_URL}',
  configurablesUrl: '${process.env.CONFIGURABLES_URL}',
  marshallerUrl: '${process.env.MARSHALLER_URL}',
  timeStampCharacteristicId: '${process.env.TIMESTAMP_CHARACTERISTIC_ID}',
  timeStampCharacteristicUnixSecondsId: '${process.env.TIMESTAMP_CHARACTERISTIC_UNIX_SECONDS_ID}',
  timeStampCharacteristicUnixNanoSecondsId: '${process.env.TIMESTAMP_CHARACTERISTIC_UNIX_NANO_SECONDS_ID}',
  timeStampCharacteristicUnixMilliSecondsId: '${process.env.TIMESTAMP_CHARACTERISTIC_UNIX_MILLI_SECONDS_ID}',
  mqttProtocolID: '${process.env.MQTT_PROTOCOL_ID}',
  getPm1FunctionId: '${process.env.GET_PM1_FUNCTION_ID}',
  getPm10FunctionId: '${process.env.GET_PM10_FUNCTION_ID}',
  getPm25FunctionId: '${process.env.GET_PM25_FUNCTION_ID}',
  getHumidityFunctionId: '${process.env.GET_HUMIDITY_FUNCTION_ID}',
  getTemperatureFunctionId: '${process.env.GET_TEMPERATURE_FUNCTION_ID}',
  getPressureFunctionId: '${process.env.GET_PRESSURE_FUNCTION_ID}',
  getCo2FunctionId: '${process.env.GET_C02_FUNCTION_ID}',
  getTimestampFunctionId: '${process.env.GET_TIMESTAMP_FUNCTION_ID}',
  aspectAirId: '${process.env.ASPECT_AIR_ID}',
  importRepoUrl: '${process.env.IMPORT_REPO_URL}',
  importDeployUrl: '${process.env.IMPORT_DEPLOY_URL}',
  importTypeIdUbaStation: '${process.env.IMPORT_TYPE_ID_UBA_STATIONS}',
  importTypeIdDwdPollen: '${process.env.IMPORT_TYPE_ID_DWD_POLLEN}',
  importTypeIdYrForecast: '${process.env.IMPORT_TYPE_ID_YR_FORECAST}',
  processFogDeploymentUrl: '${process.env.PROCESS_FOG_DEPLOYMENT_URL}',
  processSyncUrl: '${process.env.PROCESS_SYNC_URL}',
  equivalentProtocolSegments: '${process.env.EQUIVALENT_PROTOCOL_SEGMENTS}'
  costApiUrl: '${process.env.COST_API_URL}'
};
`;

fs.writeFile(targetPath, envConfigFile, function (err: any) {
    if (err) {
        console.log(err);
    }

    console.log(`Output generated at ${targetPath}`);
});
