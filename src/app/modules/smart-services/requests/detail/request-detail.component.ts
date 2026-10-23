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


import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Subscription, timer } from 'rxjs';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../../core/components/form-section/form-section.component';
import { SpinnerComponent } from '../../../../core/components/spinner/spinner.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { CodeEditorComponent } from '../../../../core/components/code-editor/code-editor.component';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { snackSuccess } from '../../../../core/services/snack-bar-messages';
import { LIST_DATE_FORMAT } from '../../../../core/classes/list-date-format';
import { parseSvgImage, svgImageDataUrl } from '../../../../core/svg-image';
import { ContentReviewService } from '../shared/content-review.service';
import { ReviewHistoryEntryModel, ReviewProposalFileModel, ReviewProposalFilesModel, ReviewRequestModel } from '../shared/content-review.model';
import {
    reviewFileChangeClass, reviewRequestRunning, reviewRequestWithdrawable, reviewStateClass, reviewStateLabel, reviewStatusClass,
    reviewStatusLabel,
} from '../shared/request-view';

/** Interval of the reload while the request, its files job, test or take-over runs. */
export const REQUEST_POLL_MS = 5000;

@Component({
    selector: 'senergy-review-request-detail',
    templateUrl: './request-detail.component.html',
    styleUrls: ['./request-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, FormSectionComponent, SpinnerComponent, EmptyStateComponent, CodeEditorComponent, MatButton, MatIcon, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe]
})
export class RequestDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private contentReviewService = inject(ContentReviewService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private destroyRef = inject(DestroyRef);

    readonly dateFormat = LIST_DATE_FORMAT;
    readonly stateLabel = reviewStateLabel;
    readonly stateClass = reviewStateClass;
    readonly statusLabel = reviewStatusLabel;
    readonly statusClass = reviewStatusClass;
    readonly changeClass = reviewFileChangeClass;
    readonly historyColumns = ['at', 'by', 'action', 'detail'];

    id = '';
    ready = false;
    request: ReviewRequestModel | null = null;
    testParameters = '';
    history: ReviewHistoryEntryModel[] = [];
    /** The files of the proposal, once the files job ended ready and they were read. */
    proposal: ReviewProposalFilesModel | null = null;
    filesLoading = false;
    selectedFile: ReviewProposalFileModel | null = null;
    /** Data URL of the selected file when it is an SVG, else null. */
    selectedSvgUrl: string | null = null;
    canWithdraw = false;
    private userId = this.contentReviewService.userId();
    /** The files job whose upload is in `proposal`, so a reload does not read the same files again. */
    private proposalOperation = '';
    private pollSub?: Subscription;
    private loadSub?: Subscription;
    private filesSub?: Subscription;

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') ?? '';
        this.destroyRef.onDestroy(() => {
            this.pollSub?.unsubscribe();
            this.loadSub?.unsubscribe();
            this.filesSub?.unsubscribe();
        });
        this.load();
    }

    /** Reads the request; while anything of it runs it reads again after `REQUEST_POLL_MS`. */
    load(): void {
        this.pollSub?.unsubscribe();
        this.loadSub?.unsubscribe();
        this.loadSub = this.contentReviewService.get(this.id).subscribe((request) => {
            this.ready = true;
            if (request === null) {
                return;
            }
            this.apply(request);
            if (reviewRequestRunning(request)) {
                this.pollSub = timer(REQUEST_POLL_MS).subscribe(() => this.load());
            }
        });
    }

    withdraw(): void {
        const request = this.request;
        if (request === null) {
            return;
        }
        this.dialogsService
            .openConfirmDialog('Withdraw request', 'Withdraw the request for ' + request.name + '? The smart service moves back to your account.')
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed !== true) {
                    return;
                }
                this.contentReviewService.withdraw(request.id).subscribe((withdrawn) => {
                    if (withdrawn) {
                        snackSuccess(this.snackBar, 'Request withdrawn.');
                    }
                    this.load();
                });
            });
    }

    select(file: ReviewProposalFileModel): void {
        this.selectedFile = file;
        this.selectedSvgUrl = null;
        if (file.path.toLowerCase().endsWith('.svg') && file.content !== null && file.change !== 'deleted') {
            const svg = parseSvgImage(file.content);
            this.selectedSvgUrl = svg === null ? null : svgImageDataUrl(svg);
        }
    }

    hasContent(file: ReviewProposalFileModel): boolean {
        return file.change !== 'deleted' && file.content !== null;
    }

    /** Only JSON is highlighted; the editor has no other file language. */
    fileLanguage(file: ReviewProposalFileModel): 'json' | 'plaintext' {
        return file.path.toLowerCase().endsWith('.json') ? 'json' : 'plaintext';
    }

    /** Names who did a step: the author by name, the service by its own name, anyone else by user id. */
    historyBy(entry: ReviewHistoryEntryModel): string {
        return this.request !== null && entry.by === this.request.author_id ? this.request.author_name : entry.by;
    }

    private apply(request: ReviewRequestModel): void {
        this.request = request;
        this.testParameters = request.test_parameters === null ? '' : JSON.stringify(request.test_parameters, null, 2);
        this.history = [...(request.history ?? [])].reverse();
        this.canWithdraw = reviewRequestWithdrawable(request, this.userId);
        this.updateFiles(request);
    }

    private updateFiles(request: ReviewRequestModel): void {
        if (request.files.status !== 'ready') {
            this.filesSub?.unsubscribe();
            this.filesLoading = false;
            this.proposal = null;
            this.proposalOperation = '';
            this.selectedFile = null;
            this.selectedSvgUrl = null;
            return;
        }
        if (this.proposal !== null && this.proposalOperation === request.files.operation_id) {
            return;
        }
        this.proposalOperation = request.files.operation_id;
        this.filesLoading = true;
        this.filesSub?.unsubscribe();
        this.filesSub = this.contentReviewService.getFiles(request.id).subscribe((proposal) => {
            this.filesLoading = false;
            this.proposal = proposal;
            if (proposal === null) {
                this.proposalOperation = '';
                return;
            }
            const files = proposal.files ?? [];
            const keep = files.find((file) => file.path === this.selectedFile?.path) ?? files[0];
            if (keep) {
                this.select(keep);
            } else {
                this.selectedFile = null;
                this.selectedSvgUrl = null;
            }
        });
    }
}
