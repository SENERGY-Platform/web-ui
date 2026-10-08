/*
 * Copyright 2020 InfAI (CC SES)
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

import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidenavService } from '../sidenav/shared/sidenav.service';
import { Router, RouterLink } from '@angular/router';
import { AuthorizationService } from '../../services/authorization.service';
import { SettingsDialogService } from '../../../modules/settings/shared/settings-dialog.service';
import { NotificationService } from '../notifications/shared/notification.service';
import { NotificationModel } from '../notifications/shared/notification.model';
import { ThemingService } from '../../services/theming.service';
import { InfoService } from 'src/app/modules/info/shared/info.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatBadge } from '@angular/material/badge';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';

@Component({
    selector: 'senergy-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatToolbar, MatIconButton, MatIcon, RouterLink, MatBadge, MatMenuTrigger, MatMenu, MatMenuItem, MatDivider]
})
export class ToolbarComponent implements OnInit {
    private sidenavService = inject(SidenavService);
    private router = inject(Router);
    private authorizationService = inject(AuthorizationService);
    private settingsDialogService = inject(SettingsDialogService);
    private themingService = inject(ThemingService);
    private notificationService = inject(NotificationService);
    private infoService = inject(InfoService);
    private destroyRef = inject(DestroyRef);

    userName = '';
    notifications: NotificationModel[] = [];
    unreadCounter = 0;
    userHasSettingsUpdateAuthorization = false;
    userHasNotificationsReadAuthorization = false;

    ngOnInit() {
        this.initUser();
        this.notificationService.getNotifications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((n) => {
            this.unreadCounter = 0;
            this.notifications = n;
            this.notifications.forEach((no) => (!no.isRead ? this.unreadCounter++ : null));
        });
        this.checkAuthorization();
    }

    checkAuthorization() {
        this.userHasSettingsUpdateAuthorization = this.settingsDialogService.userHasUpdateAuthorization();

        this.userHasNotificationsReadAuthorization = this.notificationService.userHasReadAuthorization();
    }

    toggle(): void {
        this.sidenavService.toggle();
    }

    resetSidenav(): void {
        this.sidenavService.reset();
    }

    logout(): void {
        this.authorizationService.logout();
    }

    settings(): void {
        this.settingsDialogService.openSettingsDialog();
    }

    info(): void {
        this.infoService.openInfoDialog();
    }

    private initUser() {
       this.userName = this.authorizationService.getUserName();
    }

    openNotificationsDialog() {
        this.notificationService.openDialog().subscribe();
    }

    getLogoUrl(): string {
        return this.themingService.getToolbarLogoUrl();
    }

    usingConfidentialClient = AuthorizationService.usingConfidentialClient;
}
