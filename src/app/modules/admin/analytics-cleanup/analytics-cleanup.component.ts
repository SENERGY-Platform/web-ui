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

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable, MatTableDataSource } from '@angular/material/table';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { ListSelection } from '../../../core/classes/list-selection';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import { snackError, snackSuccess } from '../../../core/services/snack-bar-messages';
import { AnalyticsCleanupService } from './shared/analytics-cleanup.service';
import { OrphanPipeline, TopicCleanupJob } from './shared/analytics-cleanup.model';

/** How often the page asks the engine for the progress of the topic job while it runs. */
export const TOPIC_JOB_POLL_MS = 2000;

@Component({
    selector: 'senergy-analytics-cleanup',
    templateUrl: './analytics-cleanup.component.html',
    styleUrls: ['./analytics-cleanup.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatButton, MatIconButton, MatCheckbox, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatPaginator, MatProgressBar, MatTab, MatTabGroup, MatTable, MatColumnDef, MatHeaderCell, MatHeaderCellDef, MatCell, MatCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, DatePipe],
})
export class AnalyticsCleanupComponent implements OnInit {
    private service = inject(AnalyticsCleanupService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    readonly dateFormat = LIST_DATE_FORMAT;

    @ViewChild('pipelinePaginator')
    set pipelinePaginator(value: MatPaginator | undefined) {
        if (value) {
            this.pipelines.paginator = value;
        }
    }

    @ViewChild('topicPaginator')
    set topicPaginator(value: MatPaginator | undefined) {
        if (value) {
            this.topics.paginator = value;
        }
    }

    pipelines = new MatTableDataSource<OrphanPipeline>();
    pipelineColumns = ['select', 'pipeline_id', 'created', 'resources', 'actions'];
    pipelineSelection = new ListSelection<OrphanPipeline>(() => this.pipelines.data);
    selection = this.pipelineSelection.model;
    pipelinesReady = false;
    pipelinesFailed = false;

    topics = new MatTableDataSource<string>();
    topicColumns = ['topic', 'actions'];
    topicsReady = false;
    topicsFailed = false;
    job: TopicCleanupJob | null = null;
    private polling?: Subscription;

    ngOnInit(): void {
        this.reload();
        this.destroyRef.onDestroy(() => this.stopPolling());
        // a job started earlier keeps running in the engine, so the page picks it up again
        this.service.getTopicJob().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((job) => {
            this.job = job;
            if (job?.running) {
                this.startPolling();
            }
        });
    }

    reload(): void {
        this.loadPipelines();
        this.loadTopics();
    }

    loadPipelines(): void {
        this.service.listPipelines().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pipelines) => {
            this.pipelinesFailed = pipelines === null;
            this.pipelines.data = pipelines ?? [];
            this.pipelineSelection.clear();
            this.pipelinesReady = true;
        });
    }

    loadTopics(): void {
        this.service.listTopics().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((topics) => {
            this.topicsFailed = topics === null;
            this.topics.data = topics ?? [];
            this.topicsReady = true;
        });
    }

    isAllSelected(): boolean {
        return this.pipelineSelection.isAllSelected();
    }

    masterToggle(): void {
        this.pipelineSelection.masterToggle();
    }

    resources(p: OrphanPipeline): string {
        const parts: string[] = [];
        if (p.deployment) {
            parts.push('Deployment');
        }
        if (p.vpa) {
            parts.push('VPA');
        }
        if (p.checkpoints?.length) {
            parts.push(countLabel(p.checkpoints.length, 'checkpoint', 'checkpoints'));
        }
        if (p.pvcs?.length) {
            parts.push(countLabel(p.pvcs.length, 'PVC', 'PVCs'));
        }
        return parts.join(', ');
    }

    deletePipeline(p: OrphanPipeline): void {
        confirmDelete(this.dialogsService, 'orphaned pipeline').subscribe(() => {
            this.service.deletePipeline(p.pipeline_id).subscribe((ok) => {
                if (ok) {
                    snackSuccess(this.snackBar, 'Pipeline resources deleted');
                } else {
                    snackError(this.snackBar, 'Error deleting the pipeline resources');
                }
                this.loadPipelines();
            });
        });
    }

    deleteSelectedPipelines(): void {
        const selected = [...this.pipelineSelection.selected];
        bulkDelete<boolean>(this.dialogsService, this.snackBar, {
            text: countLabel(selected.length, 'orphaned pipeline', 'orphaned pipelines'),
            jobs: () => selected.map((p) => this.service.deletePipeline(p.pipeline_id)),
            isSuccess: everyTrue,
            successMessage: 'Pipeline resources deleted',
            errorMessage: 'Error deleting pipeline resources',
            after: () => this.loadPipelines(),
        });
    }

    deleteAllPipelines(): void {
        confirmDelete(this.dialogsService, 'all orphaned pipelines').subscribe(() => {
            this.service.deleteAllPipelines().subscribe((result) => {
                if (result === null) {
                    snackError(this.snackBar, 'Error deleting pipeline resources');
                } else if (result.failed.length === 0) {
                    snackSuccess(this.snackBar, 'Deleted ' + result.deleted.length + ' pipelines');
                } else {
                    const first = result.failed[0];
                    snackError(this.snackBar, 'Deleted ' + result.deleted.length + ', failed ' + result.failed.length + ' (' + first.pipeline_id + ': ' + first.error + ')');
                }
                this.loadPipelines();
            });
        });
    }

    deleteTopic(topic: string): void {
        confirmDelete(this.dialogsService, 'orphaned topic').subscribe(() => {
            this.service.deleteTopic(topic).subscribe((ok) => {
                if (ok) {
                    snackSuccess(this.snackBar, 'Topic deleted');
                } else {
                    snackError(this.snackBar, 'Error deleting the topic');
                }
                this.loadTopics();
            });
        });
    }

    get jobRunning(): boolean {
        return this.job?.running === true;
    }

    get jobDone(): number {
        return this.job ? this.job.total - this.job.remaining : 0;
    }

    get jobProgress(): number {
        return this.job && this.job.total > 0 ? (this.jobDone / this.job.total) * 100 : 0;
    }

    deleteAllTopics(): void {
        confirmDelete(this.dialogsService, 'all orphaned topics').subscribe(() => {
            this.service.startTopicJob().subscribe((ok) => {
                if (ok) {
                    this.startPolling();
                }
            });
        });
    }

    stopJob(): void {
        this.service.stopTopicJob().subscribe((ok) => {
            if (ok) {
                this.refreshJob();
            }
        });
    }

    private startPolling(): void {
        this.stopPolling();
        this.polling = interval(TOPIC_JOB_POLL_MS)
            .pipe(switchMap(() => this.service.getTopicJob()))
            .subscribe((job) => this.applyJob(job));
        this.refreshJob();
    }

    private refreshJob(): void {
        this.service.getTopicJob().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((job) => this.applyJob(job));
    }

    private applyJob(job: TopicCleanupJob | null): void {
        if (job === null) {
            return;
        }
        this.job = job;
        if (!job.running) {
            this.stopPolling();
            this.loadTopics();
        }
    }

    private stopPolling(): void {
        this.polling?.unsubscribe();
        this.polling = undefined;
    }
}
