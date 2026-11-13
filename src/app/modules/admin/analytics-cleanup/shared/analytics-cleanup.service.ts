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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { OrphanPipeline, OrphanPipelinesDeleteResult, TopicCleanupJob } from './analytics-cleanup.model';

/**
 * Admin cleanup of analytics leftovers in the flow engine. A failure answers `null` or `false`; the central error
 * notice carries the backend text, so a 503 for an unavailable registry reaches the user as written by the engine.
 */
@Injectable({
    providedIn: 'root',
})
export class AnalyticsCleanupService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);

    private base(): string {
        return environment.flowEngineUrl + '/admin/cleanup';
    }

    listPipelines(): Observable<OrphanPipeline[] | null> {
        return this.http.get<OrphanPipeline[]>(this.base() + '/pipelines').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError<OrphanPipeline[] | null>(AnalyticsCleanupService.name, 'listPipelines', null)),
        );
    }

    deletePipeline(id: string): Observable<boolean> {
        return this.http.delete(this.base() + '/pipelines/' + encodeURIComponent(id)).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(AnalyticsCleanupService.name, 'deletePipeline', false)),
        );
    }

    deleteAllPipelines(): Observable<OrphanPipelinesDeleteResult | null> {
        return this.http.delete<OrphanPipelinesDeleteResult>(this.base() + '/pipelines').pipe(
            catchError(this.errorHandlerService.handleError<OrphanPipelinesDeleteResult | null>(AnalyticsCleanupService.name, 'deleteAllPipelines', null)),
        );
    }

    listTopics(): Observable<string[] | null> {
        return this.http.get<string[]>(this.base() + '/topics').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError<string[] | null>(AnalyticsCleanupService.name, 'listTopics', null)),
        );
    }

    deleteTopic(topic: string): Observable<boolean> {
        return this.http.delete(this.base() + '/topics/' + encodeURIComponent(topic)).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(AnalyticsCleanupService.name, 'deleteTopic', false)),
        );
    }

    startTopicJob(): Observable<boolean> {
        return this.http.post(this.base() + '/topics/job', null).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(AnalyticsCleanupService.name, 'startTopicJob', false)),
        );
    }

    getTopicJob(): Observable<TopicCleanupJob | null> {
        return this.http.get<TopicCleanupJob>(this.base() + '/topics/job').pipe(
            catchError(this.errorHandlerService.handleError<TopicCleanupJob | null>(AnalyticsCleanupService.name, 'getTopicJob', null)),
        );
    }

    stopTopicJob(): Observable<boolean> {
        return this.http.delete(this.base() + '/topics/job').pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(AnalyticsCleanupService.name, 'stopTopicJob', false)),
        );
    }
}
