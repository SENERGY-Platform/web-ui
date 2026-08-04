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

import {
    QueriesRequestV2ElementTimescaleModel
} from '../../../widgets/shared/export-data.model';

export interface TemplateListResponseModel {
    data: TemplateModel[];
}

export interface TemplateResponseModel {
    data: TemplateModel;
}

export interface TemplateModel {
    id: string;
    name: string;
    type: string;
    data: TemplateDataModel | undefined;
}

export interface TemplateDataModel {
    id: string;
    name: string;
    dataJsonString: string;
    dataStructured: { [key: string]: ReportObjectModel };
}

export interface ReportObjectModel {
    name: string;
    valueType: string;
    value: any | undefined;
    fields: { [key: string]: ReportObjectModel } | undefined;
    children: { [key: string]: ReportObjectModel } | undefined;
    length: number | undefined;
    query?: QueriesRequestV2ElementTimescaleModel | undefined;
    queryOptions?: ReportObjectModelQueryOptions;
    deviceQuery?: DeviceQueryModel
}

export interface DeviceQueryModel {
    last?: string;
}

export interface ReportObjectModelQueryOptions {
    rollingStartDate: string | undefined;
    rollingEndDate: string | undefined;
    startOffset: number | undefined;
    endOffset: number | undefined;
    resultObject: string | undefined;
    resultKey: number | undefined;
}

export interface ReportListResponseModel {
    data: ReportModel[];
}

export interface ReportResponseModel {
    data: ReportModel;
}

export interface ReportModel {
    id: string | undefined;
    name: string;
    templateName: string;
    templateId: string;
    data: { [key: string]: ReportObjectModel };
    reportFiles: ReportFileModel[];
    cron?: string;
    emailReceivers?: string[];
    emailSubject?: string;
    emailText?: string;
    emailHTML?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReportFileModel {
    id: string;
    type: string;
    createdAt: string;
}

export interface ReportCreateResponseModel {
    id: string | null;
    jobId: string | null;
}

export type ReportJobStatus = 'pending' | 'running' | 'done' | 'failed';

/**
 * Tracks one report file creation in the reporting service. Creating a report file
 * is queued there, so the file only exists once the job reached the done status.
 */
export interface ReportJobModel {
    id: string;
    reportId: string;
    status: ReportJobStatus;
    step?: string;
    reportFileId?: string;
    error?: string;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
}

export interface ReportJobResponseModel {
    data: ReportJobModel;
}

export interface ReportJobListResponseModel {
    data: ReportJobModel[];
}
