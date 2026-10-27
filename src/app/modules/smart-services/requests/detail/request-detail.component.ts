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
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Observable, Subscription, timer } from 'rxjs';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../../core/components/form-section/form-section.component';
import { SpinnerComponent } from '../../../../core/components/spinner/spinner.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { CodeEditorComponent } from '../../../../core/components/code-editor/code-editor.component';
import { SaveBarComponent } from '../../../../core/components/save-bar/save-bar.component';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { snackSuccess } from '../../../../core/services/snack-bar-messages';
import { dialogSize } from '../../../../core/dialog-size';
import { LIST_DATE_FORMAT } from '../../../../core/classes/list-date-format';
import { parseSvgImage, svgImageDataUrl } from '../../../../core/svg-image';
import { ContentReviewService } from '../shared/content-review.service';
import { RejectDialogComponent, RejectDialogData } from '../reject-dialog/reject-dialog.component';
import { ReviewHistoryEntryModel, ReviewProposalFileModel, ReviewProposalFilesModel, ReviewRequestModel } from '../shared/content-review.model';
import {
    reviewFileChangeClass, reviewRequestActionable, reviewRequestHasTestCase, reviewRequestPublishable, reviewRequestRunning,
    reviewRequestSyncable, reviewRequestTakeoverReady, reviewRequestWithdrawable, reviewStateClass, reviewStateLabel, reviewStatusClass, reviewStatusLabel,
} from '../shared/request-view';
import { testCaseError } from '../shared/test-case';

/** Interval of the reload while the request, its files job, test or take-over runs. */
export const REQUEST_POLL_MS = 5000;

@Component({
    selector: 'senergy-review-request-detail',
    templateUrl: './request-detail.component.html',
    styleUrls: ['./request-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, FormSectionComponent, SpinnerComponent, EmptyStateComponent, CodeEditorComponent, SaveBarComponent, MatButton, MatIcon, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe]
})
export class RequestDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private contentReviewService = inject(ContentReviewService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);
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
    /** The reviewer actions, each already narrowed by state and by what runs. */
    canPublish = false;
    canReject = false;
    canEditTestCase = false;
    canStartTest = false;
    canPreviewSync = false;
    canTakeOver = false;
    hasTestCase = false;
    /** The test case as the editor shows it; kept while the user edits, so a reload does not overwrite it. */
    testCaseText = '';
    testCaseDirty = false;
    testCaseProblem: string | null = null;
    saving = false;
    private storedTestCase = '';
    private userId = this.contentReviewService.userId();
    private reviewer = this.contentReviewService.userIsReviewer();
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

    /**
     * Reads the request; while anything of it runs it reads again after `REQUEST_POLL_MS`. `resetTestCase` also
     * replaces the editor's text by the stored test case once the request arrived; a failed read keeps the edits.
     */
    load(resetTestCase = false): void {
        this.pollSub?.unsubscribe();
        this.loadSub?.unsubscribe();
        this.loadSub = this.contentReviewService.get(this.id).subscribe((request) => {
            this.ready = true;
            if (request === null) {
                return;
            }
            this.apply(request, resetTestCase);
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

    /** Runs a write and reads the request afterwards, also after a refusal, whose message the service call shows. */
    private act(call: Observable<ReviewRequestModel | null>, success: string, resetTestCase = false): void {
        call.subscribe((result) => {
            if (result) {
                snackSuccess(this.snackBar, success);
            }
            this.load(resetTestCase && result !== null);
        });
    }

    onTestCaseText(text: string): void {
        this.testCaseText = text;
        this.checkTestCase();
    }

    discardTestCase(): void {
        this.load(true);
    }

    saveTestCase(): void {
        if (!this.canEditTestCase || !this.testCaseDirty || this.testCaseProblem !== null || this.saving) {
            return;
        }
        this.saving = true;
        this.contentReviewService.setTestCase(this.id, this.testCaseText).subscribe((result) => {
            this.saving = false;
            if (result) {
                snackSuccess(this.snackBar, 'Test case saved.');
            }
            this.load(result !== null);
        });
    }

    removeTestCase(): void {
        this.dialogsService
            .openConfirmDialog('Remove test case', 'Remove the test case? The test result is reset, and the request cannot be published without a test case.')
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed === true) {
                    this.act(this.contentReviewService.setTestCase(this.id, null), 'Test case removed.', true);
                }
            });
    }

    startTest(): void {
        this.act(this.contentReviewService.startTest(this.id), 'Test started.');
    }

    makeFilesAgain(): void {
        this.act(this.contentReviewService.startFiles(this.id), 'Making the files again.');
    }

    publish(): void {
        const request = this.request;
        if (request === null) {
            return;
        }
        this.dialogsService
            .openConfirmDialog('Publish smart service', 'Publish ' + request.name + '? It moves to shared-resources-prod and becomes available to all users.')
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed === true) {
                    this.act(this.contentReviewService.publish(request.id), 'Publishing the smart service.');
                }
            });
    }

    previewTakeover(): void {
        this.act(this.contentReviewService.previewSync(this.id), 'Previewing the take-over.');
    }

    takeOver(): void {
        const request = this.request;
        if (request === null) {
            return;
        }
        const count = request.sync.files?.length ?? 0;
        const what = count === 0
            ? ' The preview found no changes, so nothing is committed unless platform-content changed since.'
            : ' The ' + count + (count === 1 ? ' file' : ' files') +
              ' of the preview are committed to main of platform-content, from where the content jobs take them up.';
        this.dialogsService
            .openConfirmDialog('Take over smart service', 'Take over ' + request.name + '?' + what)
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed === true) {
                    this.act(this.contentReviewService.executeSync(request.id), 'Taking over the smart service.');
                }
            });
    }

    /** The take-over section shows once the request is published, and stays for a take-over that has run. */
    showTakeover(request: ReviewRequestModel): boolean {
        return request.state === 'published' || request.sync.status !== 'none';
    }

    reject(): void {
        const request = this.request;
        if (request === null) {
            return;
        }
        this.dialog
            .open<RejectDialogComponent, RejectDialogData, string>(RejectDialogComponent, { ...dialogSize('m'), data: { name: request.name } })
            .afterClosed()
            .subscribe((reason) => {
                if (reason) {
                    this.act(this.contentReviewService.reject(request.id, reason), 'Request rejected.');
                }
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

    private apply(request: ReviewRequestModel, resetTestCase: boolean): void {
        this.request = request;
        this.testParameters = request.test_parameters === null ? '' : JSON.stringify(request.test_parameters, null, 2);
        this.history = [...(request.history ?? [])].reverse();
        this.canWithdraw = reviewRequestWithdrawable(request, this.userId);
        this.hasTestCase = reviewRequestHasTestCase(request);
        const actionable = this.reviewer && reviewRequestActionable(request);
        this.canReject = actionable;
        this.canEditTestCase = actionable;
        this.canStartTest = actionable && this.hasTestCase;
        this.canPublish = this.reviewer && reviewRequestPublishable(request);
        this.canPreviewSync = this.reviewer && reviewRequestSyncable(request);
        this.canTakeOver = this.reviewer && reviewRequestTakeoverReady(request);
        this.applyTestCase(request, resetTestCase || !actionable);
        this.updateFiles(request);
    }

    /** Takes over the stored test case; unsaved edits survive a reload unless the reviewer cannot edit any more. */
    private applyTestCase(request: ReviewRequestModel, reset: boolean): void {
        this.storedTestCase = this.hasTestCase ? JSON.stringify(request.test_case, null, 2) : '';
        if (reset || !this.testCaseDirty) {
            this.testCaseText = this.storedTestCase;
        }
        this.checkTestCase();
    }

    private checkTestCase(): void {
        this.testCaseDirty = this.testCaseText !== this.storedTestCase;
        this.testCaseProblem = this.testCaseDirty ? testCaseError(this.testCaseText) : null;
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
