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

import { Component, OnInit } from '@angular/core';
import { SidenavService } from '../sidenav/shared/sidenav.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { AuthorizationService } from '../../services/authorization.service';
import { SettingsDialogService } from '../../../modules/settings/shared/settings-dialog.service';
import { NotificationService } from './notification/shared/notification.service';
import { NotificationModel } from './notification/shared/notification.model';
import { ThemingService } from '../../services/theming.service';
import { InfoService } from 'src/app/modules/info/shared/info.service';

@Component({
    selector: 'senergy-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
    userName = '';
    notifications: NotificationModel[] = [];
    unreadCounter = 0;
    userHasSettingsUpdateAuthorization = false;
    userHasNotificationsReadAuthorization = false;

    constructor(
        private sidenavService: SidenavService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private authorizationService: AuthorizationService,
        private settingsDialogService: SettingsDialogService,
        private themingService: ThemingService,
        private notificationService: NotificationService,
        private infoService: InfoService
    ) {}

    ngOnInit() {
        this.setHeader();
        this.initUser();
        this.notificationService.notificationEmitter.subscribe((n) => {
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
        this.authorizationService.getUserName().then((userName) => (this.userName = userName));
    }

    private setHeader() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                map(() => {
                    const route = this.activatedRoute.firstChild;
                    return route;
                }),
                mergeMap((route: any) => route.data),
            )
            .subscribe();
    }

    openNotificationsDialog() {
        this.notificationService.openDialog().subscribe();
    }

    getLogoUrl(): string {
        return this.themingService.getToolbarLogoUrl();
    }

    usingConfidentialClient = AuthorizationService.usingConfidentialClient;
}
