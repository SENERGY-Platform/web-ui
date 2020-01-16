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
  keycloakUrl: '${process.env.KEYCLOACK_URL}',
  processRepoUrl: '${process.env.PROCESS_REPO_URL}',
  processDeploymentUrl: '${process.env.PROCESS_DEPLOYMENT_URL}',
  processServiceUrl: '${process.env.PROCESS_SERVICE_URL}',
  processIncidentApiUrl: '${process.env.PROCESS_INCIDENT_API_URL}',
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
  semanticRepoUrl: '${process.env.SEMANTIC_REPO_URL}',
  ubaUrl: '${process.env.UBA_URL}',
  dwdOpenUrl: '${process.env.DWD_OPEN_URL}',
  geonamesUrl: '${process.env.GEONAMES_URL}',
  yrUrl: '${process.env.YR_URL}',
  notificationsUrl: '${process.env.NOTIFICATION_SERVICE_URL}',
};
`;

fs.writeFile(targetPath, envConfigFile, function (err: any) {
    if (err) {
        console.log(err);
    }

    console.log(`Output generated at ${targetPath}`);
});
