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

import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ToolbarComponent } from './toolbar.component';
import { SidenavService } from '../sidenav/shared/sidenav.service';
import { AuthorizationService } from '../../services/authorization.service';
import { SettingsDialogService } from '../../../modules/settings/shared/settings-dialog.service';
import { NotificationService } from '../notifications/shared/notification.service';
import { ThemingService } from '../../services/theming.service';
import { InfoService } from '../../../modules/info/shared/info.service';

describe('ToolbarComponent title', () => {
    let url: string;
    let events: Subject<unknown>;

    beforeEach(async () => {
        url = '/devices?x=1';
        events = new Subject();
        const routerStub = {
            events,
            get url() {
                return url;
            },
        };
        const sidenav = jasmine.createSpyObj('SidenavService', ['titleFor']);
        sidenav.titleFor.and.callFake((u: string) => [u]);
        const auth = jasmine.createSpyObj('AuthorizationService', ['getUserName']);
        auth.getUserName.and.returnValue('user');
        const settings = jasmine.createSpyObj('SettingsDialogService', ['userHasUpdateAuthorization']);
        const notifications = jasmine.createSpyObj('NotificationService', ['getNotifications', 'userHasReadAuthorization']);
        notifications.getNotifications.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [ToolbarComponent],
            providers: [
                { provide: Router, useValue: routerStub },
                { provide: SidenavService, useValue: sidenav },
                { provide: AuthorizationService, useValue: auth },
                { provide: SettingsDialogService, useValue: settings },
                { provide: NotificationService, useValue: notifications },
                { provide: ThemingService, useValue: {} },
                { provide: InfoService, useValue: {} },
            ],
        })
            .overrideComponent(ToolbarComponent, { set: { template: '', imports: [] } })
            .compileComponents();
    });

    it('is set from the current url when the navigation ended before init', () => {
        const component = TestBed.createComponent(ToolbarComponent).componentInstance;
        component.ngOnInit();

        expect(component.title).toEqual(['/devices']);
    });

    it('follows later navigations', () => {
        const component = TestBed.createComponent(ToolbarComponent).componentInstance;
        component.ngOnInit();
        url = '/other#frag';
        events.next(new NavigationEnd(1, url, url));

        expect(component.title).toEqual(['/other']);
    });
});
