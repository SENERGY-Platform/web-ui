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

/** States of a request; `refused`, `rejected`, `withdrawn`, `published` and `failed` are final. */
export type ReviewRequestState =
    | 'checking'
    | 'moving'
    | 'in_review'
    | 'rejecting'
    | 'withdrawing'
    | 'publishing'
    | 'refused'
    | 'rejected'
    | 'withdrawn'
    | 'published'
    | 'failed';

export type ReviewTestStatus = 'none' | 'running' | 'passed' | 'failed';
export type ReviewSyncStatus = 'none' | 'previewing' | 'previewed' | 'syncing' | 'synced' | 'failed';
export type ReviewFilesStatus = 'none' | 'running' | 'ready' | 'failed';
export type ReviewFileChange = 'added' | 'modified' | 'deleted' | 'unchanged';
export type ReviewOperationKind = 'transfer' | 'review-test' | 'content-sync' | 'files';
export type ReviewOperationStatus = 'running' | 'succeeded' | 'failed';

export interface ReviewTestModel {
    status: ReviewTestStatus;
    at: string | null;
    detail: string;
}

export interface ReviewSyncFileModel {
    path: string;
    change: 'added' | 'modified' | 'deleted';
}

export interface ReviewSyncModel {
    status: ReviewSyncStatus;
    files: ReviewSyncFileModel[] | null;
    truncated: boolean;
    /** Empty when no commit was pushed. */
    commit: string;
    at: string | null;
    detail: string;
}

export interface ReviewFilesModel {
    status: ReviewFilesStatus;
    at: string | null;
    detail: string;
    truncated: boolean;
    count: number;
    operation_id: string;
}

export interface ReviewOperationModel {
    id: string;
    kind: ReviewOperationKind;
    status: ReviewOperationStatus;
    result: unknown;
    started_at: string;
    finished_at: string | null;
}

export interface ReviewHistoryEntryModel {
    at: string;
    /** A user id, or `content-review` for a step the service took on its own. */
    by: string;
    action: string;
    detail: string;
}

/** A request to publish one smart service, as content-review stores it. */
export interface ReviewRequestModel {
    id: string;
    kind: string;
    design_id: string;
    release_id: string;
    /** Name of the smart service. */
    name: string;
    author_id: string;
    author_name: string;
    test_description: string;
    test_parameters: Record<string, unknown> | null;
    test_case: Record<string, unknown> | null;
    state: ReviewRequestState;
    error: string;
    test: ReviewTestModel;
    sync: ReviewSyncModel;
    files: ReviewFilesModel;
    operations: ReviewOperationModel[] | null;
    history: ReviewHistoryEntryModel[] | null;
    created_at: string;
    updated_at: string;
    version: number;
}

/** One file of the proposal; `content` is null when deleted, no UTF-8 text or left out to fit the upload. */
export interface ReviewProposalFileModel {
    path: string;
    change: ReviewFileChange;
    content: string | null;
}

export interface ReviewProposalFilesModel {
    operation_id: string;
    at: string;
    truncated: boolean;
    files: ReviewProposalFileModel[] | null;
}
