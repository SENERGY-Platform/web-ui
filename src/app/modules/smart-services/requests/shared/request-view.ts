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


import { ReviewFileChange, ReviewRequestModel, ReviewRequestState } from './content-review.model';

/** States the service moves out of by itself; `in_review` waits for a person and is not one of them. */
const TRANSITIONAL_STATES: ReviewRequestState[] = ['checking', 'moving', 'rejecting', 'withdrawing', 'publishing'];

const STATE_LABELS: Record<ReviewRequestState, string> = {
    checking: 'Checking',
    moving: 'Moving',
    in_review: 'In review',
    rejecting: 'Rejecting',
    withdrawing: 'Withdrawing',
    publishing: 'Publishing',
    refused: 'Refused',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    published: 'Published',
    failed: 'Failed',
};

export function reviewStateLabel(state: ReviewRequestState): string {
    return STATE_LABELS[state] ?? state;
}

/** Modifier of `.status-chip` for a state; the transitional states keep the neutral dot. */
export function reviewStateClass(state: ReviewRequestState): string {
    switch (state) {
    case 'published':
        return 'online';
    case 'in_review':
        return 'warning';
    case 'refused':
    case 'failed':
        return 'failed';
    case 'rejected':
    case 'withdrawn':
        return 'hollow';
    default:
        return '';
    }
}

export function reviewFileChangeClass(change: ReviewFileChange): string {
    switch (change) {
    case 'added':
        return 'online';
    case 'modified':
        return 'warning';
    case 'deleted':
        return 'failed';
    default:
        return 'hollow';
    }
}

/** Something is still going on: a transitional state, or a files job, test, take-over or other operation that runs. */
export function reviewRequestRunning(request: ReviewRequestModel): boolean {
    return (
        TRANSITIONAL_STATES.includes(request.state) ||
        request.files?.status === 'running' ||
        request.test?.status === 'running' ||
        request.sync?.status === 'previewing' ||
        request.sync?.status === 'syncing' ||
        (request.operations ?? []).some((operation) => operation.status === 'running')
    );
}

/** What the reviewers may act on: in review, with no files job, test, transfer or other operation running. */
export function reviewRequestActionable(request: ReviewRequestModel): boolean {
    return request.state === 'in_review' && !reviewRequestRunning(request);
}

export function reviewRequestHasTestCase(request: ReviewRequestModel): boolean {
    return request.test_case !== null && request.test_case !== undefined;
}

/** A stored test case and a test that passed with it, which is what publishing needs. */
export function reviewRequestPublishable(request: ReviewRequestModel): boolean {
    return reviewRequestActionable(request) && reviewRequestHasTestCase(request) && request.test.status === 'passed';
}

/** Published, with a test case and nothing running: the take-over may be previewed. */
export function reviewRequestSyncable(request: ReviewRequestModel): boolean {
    return request.state === 'published' && reviewRequestHasTestCase(request) && !reviewRequestRunning(request);
}

/** Syncable and previewed, which is what the take-over itself needs. */
export function reviewRequestTakeoverReady(request: ReviewRequestModel): boolean {
    return reviewRequestSyncable(request) && request.sync?.status === 'previewed';
}

/** The author takes a request back while it is in review. */
export function reviewRequestWithdrawable(request: ReviewRequestModel, userId: string): boolean {
    return request.state === 'in_review' && userId !== '' && request.author_id === userId;
}

/** Modifier of `.status-chip` for the status of a test, take-over, files job or operation. */
export function reviewStatusClass(status: string): string {
    switch (status) {
    case 'passed':
    case 'previewed':
    case 'synced':
    case 'ready':
    case 'succeeded':
        return 'online';
    case 'running':
    case 'previewing':
    case 'syncing':
        return 'warning';
    case 'failed':
        return 'failed';
    default:
        return 'hollow';
    }
}

export function reviewStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
}
