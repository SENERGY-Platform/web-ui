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

import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { SearchbarService } from '../searchbar/shared/searchbar.service';
import { DialogsService } from '../../services/dialogs.service';
import { PreferencesService } from '../../services/preferences.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import {
  NotificationModel,
  NotificationTopic,
  notificationTopicAnalytics,
  notificationTopicConnector,
  notificationTopicDeveloper,
  notificationTopicDeviceOffline,
  notificationTopicIncident,
  notificationTopicMGW,
  notificationTopicProcesses,
  notificationTopicSmartService,
} from './shared/notification.model';
import { NotificationService } from './shared/notification.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConnectionHistoryDialogComponent } from 'src/app/widgets/shared/connection-history-dialog/connection-history-dialog.component';
import { Router } from '@angular/router';

interface NotificationDisplayModel extends NotificationModel {
  action?: () => void;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  @ViewChild('paginator', { static: false })
  set paginator(value: MatPaginator | undefined) {
    this._paginator = value;
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  get paginator(): MatPaginator | undefined {
    return this._paginator;
  }

  notificationService = inject(NotificationService);
  dialogsService = inject(DialogsService);
  searchbarService = inject(SearchbarService);
  preferencesService = inject(PreferencesService);
  dialog = inject(MatDialog);
  router = inject(Router);

  private readonly destroy$ = new Subject<void>();
  private _paginator?: MatPaginator;

  ready = false;

  notifications: NotificationDisplayModel[] = [];
  dataSource = new MatTableDataSource<NotificationDisplayModel>();
  selection = new SelectionModel<NotificationDisplayModel>(true, []);
  displayedColumns: string[] = ['select', 'topic', 'title', 'message', 'details', 'created_at', 'actions'];

  private readonly topicIconMap: Record<string, string> = {
    [notificationTopicProcesses]: 'timeline',
    [notificationTopicSmartService]: 'design_services',
    [notificationTopicDeviceOffline]: 'cloud_off',
    [notificationTopicDeveloper]: 'engineering',
    [notificationTopicConnector]: 'device_hub',
    [notificationTopicMGW]: 'home',
    [notificationTopicIncident]: 'warning',
    [notificationTopicAnalytics]: 'bar_chart',
  };

  private readonly deviceReferencePattern = /device (.+?)\s*\((urn:infai:ses:device:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/;

  ngOnInit() {
    this.dataSource.filterPredicate = (notification: NotificationModel, filter: string): boolean => {
      const needle = filter.trim().toLowerCase();
      if (!needle) {
        return true;
      }
      const content = [
        notification.title,
        notification.message,
        notification.topic || 'misc',
      ].join(' ').toLowerCase();
      return content.includes(needle);
    };

    this.notificationService.getNotifications().pipe(takeUntil(this.destroy$)).subscribe((n) => {
      this.notifications = [...n].sort((a, b) => this.toTimestamp(b.created_at) - this.toTimestamp(a.created_at));
      this.notifications.forEach((no) => {
        switch (no.topic) {
          case notificationTopicDeviceOffline: {
            const deviceReference = this.deviceReferencePattern.exec(no.message);
            if (deviceReference && deviceReference.index !== undefined) {
              no.action = () => {
                this.openDowntimeDialog(no, deviceReference[2]);
              };
            }
            break;
          }
          case notificationTopicSmartService: {
            if (no.title.includes('Smart-Service-Module Error') || no.title.includes('Smart-Service-Instance Error')) {
              no.action = () => {
                this.router.navigate(['/smart-services/instances']);
              };
            }
            break;
          }
          case notificationTopicIncident: {
            no.action = () => {
              this.router.navigate(['/processes/monitor']);
            };
          }
          default:
            break;
        }
      });
      this.dataSource.data = this.notifications;
      if (!this.ready) {
        this.ready = true;
      }
      this.reconcileSelection();
    });

    this.searchbarService.currentSearchText.pipe(takeUntil(this.destroy$), debounceTime(300)).subscribe((searchText: string) => {
      this.dataSource.filter = searchText;
      this.paginator?.firstPage();
      this.reconcileSelection();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isAllSelected(): boolean {
    const currentRows = this.dataSource.connect().value;
    const selectedRows = currentRows.filter((row) => this.selection.isSelected(row)).length;
    return currentRows.length > 0 && selectedRows === currentRows.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.dataSource.connect().value.forEach((row) => this.selection.deselect(row));
    } else {
      this.dataSource.connect().value.forEach((row) => this.selection.select(row));
    }
  }

  toggleReadStatus(notification: NotificationModel): void {
    notification.isRead = !notification.isRead;
    this.notificationService.updateNotification(notification).subscribe();
  }

  deleteNotification(notification: NotificationModel): void {
    this.dialogsService
      .openDeleteDialog('notification')
      .afterClosed()
      .subscribe((deleteNotification: boolean) => {
        if (deleteNotification) {
          this.notificationService.deleteNotification(notification).subscribe(() => {
            this.selection.deselect(notification);
          });
        }
      });
  }

  deleteSelectedNotifications(): void {
    if (this.selection.selected.length === 0) {
      return;
    }

    this.dialogsService
      .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' notifications' : ' notification'))
      .afterClosed()
      .subscribe((deleteNotifications: boolean) => {
        if (deleteNotifications) {
          const ids = this.selection.selected.map((n) => n._id);
          this.notificationService.deleteNotifications(ids).subscribe(() => {
            this.selection.clear();
          });
        }
      });
  }

  getTopicIcon(topic?: NotificationTopic): string {
    return this.topicIconMap[topic || ''] || 'chat';
  }

  trackByNotificationId(_: number, notification: NotificationModel): string {
    return notification._id;
  }

  selectionClear($event: PageEvent | undefined = undefined): void {
    if ($event !== undefined) {
      this.preferencesService.pageSize = $event.pageSize;
    }
    this.selection.clear();
  }

  openDowntimeDialog(notification: NotificationModel, id: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '75vw';
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      id: id,
    };
    this.dialog.open(ConnectionHistoryDialogComponent, dialogConfig);
    if (!notification.isRead) {
      this.toggleReadStatus(notification);
    }
    return;
  }

  markAllRead() {
    this.notifications.filter((n) => !n.isRead).forEach((n) => {
      n.isRead = true;
      this.notificationService.updateNotification(n).subscribe();
    });
  }

  deleteAll() {
    this.dialogsService
      .openDeleteDialog('notifications')
      .afterClosed()
      .subscribe((deleteNotifications: boolean) => {
        if (deleteNotifications) {
          this.notificationService.deleteNotifications(this.notifications.map(n => n._id)).subscribe(() => {
            this.selection.clear();
          });
        }
      });
  }

  private toTimestamp(dateValue: Date | null): number {
    if (!dateValue) {
      return 0;
    }
    return new Date(dateValue).getTime();
  }

  private reconcileSelection(): void {
    const selectedIds = new Set(this.selection.selected.map((n) => n._id));
    const byId = new Map(this.notifications.map((n) => [n._id, n]));

    this.selection.clear();
    selectedIds.forEach((id) => {
      const match = byId.get(id);
      if (match) {
        this.selection.select(match);
      }
    });
  }

}
