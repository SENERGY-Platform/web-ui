/*
 * Copyright 2026 InfAI (CC SES)
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

import { ReportJobModel } from './reporting.model';

/**
 * Whether the report job reached a final state and does not need to be polled again.
 */
export const reportJobDone = (job: ReportJobModel): boolean =>
    job.status === 'done' || job.status === 'failed';

/**
 * Whether the report job failed. A failed job carries the reason in its error field.
 */
export const reportJobFailed = (job: ReportJobModel): boolean => job.status === 'failed';

/**
 * Text describing what is happening to the report file, for display next to a
 * progress indicator.
 */
export const reportJobLabel = (job: ReportJobModel): string => {
    switch (job.status) {
    case 'pending':
        return 'Report creation queued';
    case 'running':
        return reportJobStepLabel(job.step);
    case 'done':
        return 'Report created';
    case 'failed':
        return job.error ? 'Report creation failed: ' + job.error : 'Report creation failed';
    default:
        return 'Creating report';
    }
};

const reportJobStepLabel = (step: string | undefined): string => {
    switch (step) {
    case 'collecting_data':
        return 'Collecting data';
    case 'rendering':
        return 'Rendering report';
    case 'emailing':
        return 'Sending e-mail';
    default:
        return 'Creating report';
    }
};
