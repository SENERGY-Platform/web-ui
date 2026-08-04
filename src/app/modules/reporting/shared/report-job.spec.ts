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

import { ReportJobModel, ReportJobStatus } from './reporting.model';
import { reportJobDone, reportJobFailed, reportJobLabel } from './report-job';

const job = (status: ReportJobStatus, extra: Partial<ReportJobModel> = {}): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status, createdAt: '2026-01-01T00:00:00Z', ...extra,
});

describe('reportJobDone', () => {
    it('is false while the job has not been picked up', () => {
        expect(reportJobDone(job('pending'))).toBe(false);
    });

    it('is false while the job is running', () => {
        expect(reportJobDone(job('running'))).toBe(false);
    });

    it('is true for a finished job', () => {
        expect(reportJobDone(job('done'))).toBe(true);
    });

    it('is true for a failed job', () => {
        expect(reportJobDone(job('failed'))).toBe(true);
    });
});

describe('reportJobFailed', () => {
    it('is true only for a failed job', () => {
        expect(reportJobFailed(job('failed'))).toBe(true);
        expect(reportJobFailed(job('done'))).toBe(false);
        expect(reportJobFailed(job('running'))).toBe(false);
    });
});

describe('reportJobLabel', () => {
    it('names the queue while the job waits', () => {
        expect(reportJobLabel(job('pending'))).toBe('Report creation queued');
    });

    it('names the step the job is working on', () => {
        expect(reportJobLabel(job('running', { step: 'collecting_data' }))).toBe('Collecting data');
        expect(reportJobLabel(job('running', { step: 'rendering' }))).toBe('Rendering report');
        expect(reportJobLabel(job('running', { step: 'emailing' }))).toBe('Sending e-mail');
    });

    it('falls back to a generic text for a step it does not know', () => {
        expect(reportJobLabel(job('running', { step: 'something_new' }))).toBe('Creating report');
        expect(reportJobLabel(job('running'))).toBe('Creating report');
    });

    it('reports success', () => {
        expect(reportJobLabel(job('done', { reportFileId: 'f1' }))).toBe('Report created');
    });

    it('includes the reason a job failed', () => {
        expect(reportJobLabel(job('failed', { error: 'template not found' })))
            .toBe('Report creation failed: template not found');
    });

    it('reports a failure without a reason', () => {
        expect(reportJobLabel(job('failed'))).toBe('Report creation failed');
    });
});
