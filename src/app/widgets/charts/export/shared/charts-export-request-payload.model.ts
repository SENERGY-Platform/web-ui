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

export interface ChartsExportRequestPayloadModel {
    time: ChartsExportRequestPayloadTimeModel;
    group: ChartsExportRequestPayloadGroupModel;
    queries: ChartsExportRequestPayloadQueriesModel[];
    limit?: number;
}

export interface ChartsExportRequestPayloadTimeModel {
    last: string | undefined;
    ahead: string | undefined;
    start: string | undefined;
    end: string | undefined;
}

export interface ChartsExportRequestPayloadGroupModel {
    time: string;
    type: string | undefined;
}

export interface ChartsExportRequestPayloadQueriesModel {
    id: string;
    fields: ChartsExportRequestPayloadQueriesFieldsModel[];
}

export interface ChartsExportRequestPayloadQueriesFieldsModel {
    name: string;
    math: string;
    filterType?: '=' | '<>' | '!=' | '>' | '>=' | '<' | '<=';
    filterValue?: string | number;
}
