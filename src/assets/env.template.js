/*
 * Copyright 2021 InfAI (CC SES)
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

(function (window) {
    window["env"] = window["env"] || {};

    // Environment variables
    window["env"]["keyCloakRealm"] = "${KEYCLOACK_REALM}";
    window["env"]["keyCloakClientId"] = "${KEYCLOACK_CLIENT_ID}";


    window["env"]["keycloakUrl"] = "${KEYCLOACK_URL}";

    window["env"]["processRepoUrl"] = "${PROCESS_REPO_URL}";
    window["env"]["processDeploymentUrl"] = "${PROCESS_DEPLOYMENT_URL}";
    window["env"]["processServiceUrl"] = "${PROCESS_SERVICE_URL}";
    window["env"]["processIncidentApiUrl"] = "${PROCESS_INCIDENT_API_URL}";
    window["env"]["processSchedulerUrl"] = "${PROCESS_SCHEDULER_URL}";

    window["env"]["operatorRepoUrl"] = "${OPERATOR_REPO_URL}";
    window["env"]["pipelineRegistryUrl"] = "${PIPELINE_REGISTRY_URL}";
    window["env"]["influxAPIURL"] = "${INFLUX_API_URL}";
    window["env"]["exportService"] = "${EXPORT_SERVICE}";
    window["env"]["flowRepoUrl"] = "${FLOW_REPO_URL}";
    window["env"]["flowEngineUrl"] = "${FLOW_ENGINE_URL}";
    window["env"]["flowParserUrl"] = "${FLOW_PARSER_URL}";

    window["env"]["permissionSearchUrl"] = "${PERMISSION_SEARCH_URL}";
    window["env"]["permissionCommandUrl"] = "${PERMISSION_COMMAND_URL}";
    window["env"]["apiAggregatorUrl"] = "${API_AGGREGATOR_URL}";
    window["env"]["deviceRepoUrl"] = "${DEVICE_REPO_URL}";
    window["env"]["deviceManagerUrl"] = "${DEVICE_MANAGER_URL}";
    window["env"]["dashboardServiceUrl"] = "${DASHBOARD_SERVICE_URL}";
    window["env"]["usersServiceUrl"] = "${USERS_SERVICE_URL}";
    window["env"]["semanticRepoUrl"] = "${SEMANTIC_REPO_URL}";
    window["env"]["ubaUrl"] = "${UBA_URL}";
    window["env"]["dwdOpenUrl"] = "${DWD_OPEN_URL}";
    window["env"]["geonamesUrl"] = "${GEONAMES_URL}";
    window["env"]["yrUrl"] = "${YR_URL}";
    window["env"]["notificationsUrl"] = "${NOTIFICATION_SERVICE_URL}";
    window["env"]["notificationsWebsocketUrl"] = "${NOTIFICATION_SERVICE_WEBSOCKET_URL}";
    window["env"]["deviceSelectionUrl"] = "${DEVICE_SELECTION_URL}";
    window["env"]["configurablesUrl"] = "${CONFIGURABLES_URL}";
    window["env"]["marshallerUrl"] = "${MARSHALLER_URL}";
    window["env"]["importRepoUrl"] = "${IMPORT_REPO_URL}";
    window["env"]["importDeployUrl"] = "${IMPORT_DEPLOY_URL}";
    window["env"]["equivalentProtocolSegments"] = "${EQUIVALENT_PROTOCOL_SEGMENTS}";

    window["env"]["timeStampCharacteristicId"] = "${TIMESTAMP_CHARACTERISTIC_ID}";
    window["env"]["timeStampCharacteristicUnixSecondsId"] = "${TIMESTAMP_CHARACTERISTIC_UNIX_SECONDS_ID}";
    window["env"]["timeStampCharacteristicUnixMilliSecondsId"] = "${TIMESTAMP_CHARACTERISTIC_UNIX_MILLI_SECONDS_ID}";
    window["env"]["timeStampCharacteristicUnixNanoSecondsId"] = "${TIMESTAMP_CHARACTERISTIC_UNIX_NANO_SECONDS_ID}";
    window["env"]["mqttProtocolID"] = "${MQTT_PROTOCOL_ID}";
    window["env"]["getPm1FunctionId"] = "${GET_PM1_FUNCTION_ID}";
    window["env"]["getPm10FunctionId"] = "${GET_PM10_FUNCTION_ID}";
    window["env"]["getPm25FunctionId"] = "${GET_PM25_FUNCTION_ID}";
    window["env"]["getHumidityFunctionId"] = "${GET_HUMIDITY_FUNCTION_ID}";
    window["env"]["getTemperatureFunctionId"] = "${GET_TEMPERATURE_FUNCTION_ID}";
    window["env"]["getPressureFunctionId"] = "${GET_PRESSURE_FUNCTION_ID}";
    window["env"]["getCo2FunctionId"] = "${GET_C02_FUNCTION_ID}";
    window["env"]["getTimestampFunctionId"] = "${GET_TIMESTAMP_FUNCTION_ID}";
    window["env"]["aspectAirId"] = "${ASPECT_AIR_ID}";

    window["env"]["importTypeIdUbaStation"] = "${IMPORT_TYPE_ID_UBA_STATIONS}";
    window["env"]["importTypeIdDwdPollen"] = "${IMPORT_TYPE_ID_DWD_POLLEN}";
    window["env"]["importTypeIdYrForecast"] = "${IMPORT_TYPE_ID_YR_FORECAST}";

    window["env"]["processFogDeploymentUrl"] = "${PROCESS_SYNC_URL}";
    window["env"]["processSyncUrl"] = "${PROCESS_FOG_DEPLOYMENT_URL}";

    window["env"]["iotRepoUrl"] = "${IOT_REPO_URL}";

})(this);
