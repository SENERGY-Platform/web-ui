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
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import {
    MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable,
    MatTableDataSource,
} from '@angular/material/table';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { loadAllPages } from '../../../core/classes/load-all-pages';
import { PreferencesService } from '../../../core/services/preferences.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { snackSuccess } from '../../../core/services/snack-bar-messages';
import { ContentReviewService } from './shared/content-review.service';
import { ReviewRequestModel } from './shared/content-review.model';
import { reviewRequestWithdrawable, reviewStateClass, reviewStateLabel } from './shared/request-view';

@Component({
    selector: 'senergy-review-requests',
    templateUrl: './requests.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatChipListbox, MatChipOption, MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatPaginator, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe]
})
export class RequestsComponent implements OnInit {
    private contentReviewService = inject(ContentReviewService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    /** The service has no total, so the whole list is read and paged on the client. */
    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value) {
            this.dataSource.paginator = value;
        }
    }

    readonly dateFormat = LIST_DATE_FORMAT;
    readonly stateLabel = reviewStateLabel;
    readonly stateClass = reviewStateClass;
    dataSource = new MatTableDataSource<ReviewRequestModel>([]);
    ready = false;
    userHasReadAuthorization = this.contentReviewService.userHasReadAuthorization();
    isReviewer = this.contentReviewService.userIsReviewer();
    /** Off: the user's own requests; on: every request, for reviewers. */
    showAll = false;
    private userId = this.contentReviewService.userId();
    private loadSub?: Subscription;

    ngOnInit(): void {
        this.destroyRef.onDestroy(() => this.loadSub?.unsubscribe());
        this.reload();
    }

    get displayedColumns(): string[] {
        return this.showAll ? ['name', 'author', 'state', 'created', 'updated', 'actions'] : ['name', 'state', 'created', 'updated', 'actions'];
    }

    reload(): void {
        if (!this.userHasReadAuthorization) {
            this.dataSource.data = [];
            this.ready = true;
            return;
        }
        this.ready = false;
        this.loadSub?.unsubscribe();
        this.loadSub = loadAllPages((limit, offset) => this.contentReviewService.list(this.showAll, limit, offset)).subscribe((requests) => {
            this.dataSource.data = requests;
            this.dataSource.paginator?.firstPage();
            this.ready = true;
        });
    }

    toggleAll(show: boolean): void {
        this.showAll = show;
        this.reload();
    }

    open(request: ReviewRequestModel): void {
        this.router.navigate(['/smart-services/requests', request.id]);
    }

    canWithdraw(request: ReviewRequestModel): boolean {
        return reviewRequestWithdrawable(request, this.userId);
    }

    withdraw(request: ReviewRequestModel): void {
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
                    this.reload();
                });
            });
    }
}
