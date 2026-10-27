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


import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from '../../../admin/permissions/shared/permission.model';
import { SmartServiceReleaseModel } from '../../releases/shared/release.model';
import { ReviewProposalFilesModel, ReviewRequestModel } from './content-review.model';

/** Keycloak group of the reviewers; the service counts the realm role `admin` as well. */
export const REVIEW_GROUP = '/shared-resources-review';

@Injectable({
    providedIn: 'root',
})
export class ContentReviewService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);
    private ladonService = inject(LadonService);
    private authorizationService = inject(AuthorizationService);

    authorizations: PermissionTestResponse | undefined;

    constructor() {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.contentReviewUrl);
    }

    /** Own requests, or with `all` every request, which only reviewers may read. A failed page answers an empty one. */
    list(all: boolean, limit: number, offset: number): Observable<ReviewRequestModel[]> {
        let params = new HttpParams().set('limit', limit).set('offset', offset);
        if (all) {
            params = params.set('all', 'true');
        }
        return this.http
            .get<ReviewRequestModel[] | null>(environment.contentReviewUrl + '/requests', { params })
            .pipe(
                map((requests) => requests || []),
                catchError(this.errorHandlerService.handleError(ContentReviewService.name, 'list()', [] as ReviewRequestModel[])),
            );
    }

    get(id: string): Observable<ReviewRequestModel | null> {
        return this.http
            .get<ReviewRequestModel>(environment.contentReviewUrl + '/requests/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(ContentReviewService.name, 'get()', null)));
    }

    /**
     * `testParametersJson` is the text of a JSON object and is sent as typed: the service stores every number
     * exactly as sent, which a parse and stringify here would not keep. Answers null after reporting a failure,
     * so a dialog can stay open with the backend's message shown.
     */
    propose(releaseId: string, testDescription: string, testParametersJson?: string): Observable<ReviewRequestModel | null> {
        const parameters = testParametersJson ? ',"test_parameters":' + testParametersJson : '';
        const body = '{"release_id":' + JSON.stringify(releaseId) + ',"test_description":' + JSON.stringify(testDescription) + parameters + '}';
        return this.http
            .post<ReviewRequestModel>(environment.contentReviewUrl + '/requests', body, { headers: { 'Content-Type': 'application/json' } })
            .pipe(catchError(this.errorHandlerService.handleError(ContentReviewService.name, 'propose()', null)));
    }

    withdraw(id: string): Observable<ReviewRequestModel | null> {
        return this.http
            .post<ReviewRequestModel>(environment.contentReviewUrl + '/requests/' + id + '/withdraw', {})
            .pipe(catchError(this.errorHandlerService.handleError(ContentReviewService.name, 'withdraw()', null)));
    }

    /**
     * `testCaseJson` is the text of a JSON object, sent as typed like the test parameters; null removes the test
     * case. A changed test case resets the test. Answers null after reporting a failure.
     */
    setTestCase(id: string, testCaseJson: string | null): Observable<ReviewRequestModel | null> {
        return this.http
            .put<ReviewRequestModel>(environment.contentReviewUrl + '/requests/' + id + '/test-case', '{"test_case":' + (testCaseJson ?? 'null') + '}', {
                headers: { 'Content-Type': 'application/json' },
            })
            .pipe(catchError(this.errorHandlerService.handleError(ContentReviewService.name, 'setTestCase()', null)));
    }

    /** Starts the review test; the service answers 409 while another request is being tested. */
    startTest(id: string): Observable<ReviewRequestModel | null> {
        return this.post(id, 'test', 'startTest()');
    }

    /** Makes the files of the proposal again from what staging holds now. */
    startFiles(id: string): Observable<ReviewRequestModel | null> {
        return this.post(id, 'files', 'startFiles()');
    }

    publish(id: string): Observable<ReviewRequestModel | null> {
        return this.post(id, 'publish', 'publish()');
    }

    /** Previews the take-over into platform-content; writes nothing. */
    previewSync(id: string): Observable<ReviewRequestModel | null> {
        return this.post(id, 'sync', 'previewSync()');
    }

    /** Commits the files to platform-content; the service pulls again, so they can differ from the preview's. */
    executeSync(id: string): Observable<ReviewRequestModel | null> {
        return this.post(id, 'sync/execute', 'executeSync()');
    }

    reject(id: string, reason: string): Observable<ReviewRequestModel | null> {
        return this.post(id, 'reject', 'reject()', { reason });
    }

    /** The service answers 404 unless `files.status` is `ready`; call it only then. */
    getFiles(id: string): Observable<ReviewProposalFilesModel | null> {
        return this.http
            .get<ReviewProposalFilesModel>(environment.contentReviewUrl + '/requests/' + id + '/files')
            .pipe(catchError(this.errorHandlerService.handleError(ContentReviewService.name, 'getFiles()', null)));
    }

    private post(id: string, action: string, name: string, body: object = {}): Observable<ReviewRequestModel | null> {
        return this.http
            .post<ReviewRequestModel>(environment.contentReviewUrl + '/requests/' + id + '/' + action, body)
            .pipe(catchError(this.errorHandlerService.handleError(ContentReviewService.name, name, null)));
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations?.GET === true;
    }

    userHasProposeAuthorization(): boolean {
        return this.authorizations?.POST === true;
    }

    /** Mirrors the service, which enforces it: members of the review group and holders of the realm role `admin`. */
    userIsReviewer(): boolean {
        return (this.authorizationService.getUsersGroups() || []).includes(REVIEW_GROUP) || this.authorizationService.userIsAdmin();
    }

    userId(): string {
        const id = this.authorizationService.getUserId();
        return typeof id === 'string' ? id : '';
    }

    /** Only the latest release of a design, created by the user, may be proposed. */
    canProposeRelease(release: Pick<SmartServiceReleaseModel, 'creator' | 'new_release_id'>): boolean {
        return this.userHasProposeAuthorization() && !release.new_release_id && !!release.creator && release.creator === this.userId();
    }
}
