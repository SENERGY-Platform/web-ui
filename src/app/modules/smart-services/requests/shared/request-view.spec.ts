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

import { ReviewRequestModel } from './content-review.model';
import { reviewRequestSyncable, reviewRequestTakeoverReady } from './request-view';

describe('request view take-over helpers', () => {
    const request = (overrides: Partial<ReviewRequestModel> = {}): ReviewRequestModel => ({
        id: 'r1', kind: 'smart-service', design_id: 'd', release_id: 'rel-1', name: 'Heating', author_id: 'author', author_name: 'Ada',
        test_description: 'Check the heating', test_parameters: null, test_case: { parameters: {} }, state: 'published', error: '',
        test: { status: 'passed', at: null, detail: '' },
        sync: { status: 'none', files: null, truncated: false, commit: '', at: null, detail: '' },
        files: { status: 'none', at: null, detail: '', truncated: false, count: 0, operation_id: '' },
        operations: null, history: null, created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-21T11:30:00Z', version: 1,
        ...overrides,
    });
    const sync = (status: ReviewRequestModel['sync']['status']): ReviewRequestModel['sync'] =>
        ({ status, files: null, truncated: false, commit: '', at: null, detail: '' });

    describe('reviewRequestSyncable', () => {
        it('is true for a published request with a test case and nothing running', () => {
            expect(reviewRequestSyncable(request())).toBeTrue();
            for (const status of ['none', 'previewed', 'synced', 'failed'] as const) {
                expect(reviewRequestSyncable(request({ sync: sync(status) }))).toBeTrue();
            }
        });

        it('is false in every other state', () => {
            for (const state of ['checking', 'moving', 'in_review', 'rejecting', 'withdrawing', 'publishing', 'refused', 'rejected', 'withdrawn', 'failed'] as const) {
                expect(reviewRequestSyncable(request({ state }))).toBeFalse();
            }
        });

        it('is false without a test case', () => {
            expect(reviewRequestSyncable(request({ test_case: null }))).toBeFalse();
        });

        it('is false while a preview or a take-over runs', () => {
            expect(reviewRequestSyncable(request({ sync: sync('previewing') }))).toBeFalse();
            expect(reviewRequestSyncable(request({ sync: sync('syncing') }))).toBeFalse();
        });

        it('is false while the files job, the test or another operation runs', () => {
            expect(reviewRequestSyncable(request({ files: { status: 'running', at: null, detail: '', truncated: false, count: 0, operation_id: '' } }))).toBeFalse();
            expect(reviewRequestSyncable(request({ test: { status: 'running', at: null, detail: '' } }))).toBeFalse();
            expect(reviewRequestSyncable(request({
                operations: [{ id: 'o', kind: 'content-sync', status: 'running', result: null, started_at: '2026-10-21T11:00:00Z', finished_at: null }],
            }))).toBeFalse();
        });
    });

    describe('reviewRequestTakeoverReady', () => {
        it('is true only for a preview that is done', () => {
            expect(reviewRequestTakeoverReady(request({ sync: sync('previewed') }))).toBeTrue();
            for (const status of ['none', 'previewing', 'syncing', 'synced', 'failed'] as const) {
                expect(reviewRequestTakeoverReady(request({ sync: sync(status) }))).toBeFalse();
            }
        });

        it('is false when the request is not syncable even if previewed', () => {
            expect(reviewRequestTakeoverReady(request({ sync: sync('previewed'), state: 'in_review' }))).toBeFalse();
            expect(reviewRequestTakeoverReady(request({ sync: sync('previewed'), test_case: null }))).toBeFalse();
            expect(reviewRequestTakeoverReady(request({
                sync: sync('previewed'),
                operations: [{ id: 'o', kind: 'files', status: 'running', result: null, started_at: '2026-10-21T11:00:00Z', finished_at: null }],
            }))).toBeFalse();
        });
    });
});
