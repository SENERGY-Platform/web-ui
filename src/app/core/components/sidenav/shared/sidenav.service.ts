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

import { EventEmitter, Injectable, OnDestroy, Output } from '@angular/core';

import { SidenavSectionModel } from './sidenav-section.model';
import { SidenavPageModel } from './sidenav-page.model';
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../services/error-handler.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WaitingRoomService } from '../../../../modules/devices/waiting-room/shared/waiting-room.service';
import { debounceTime } from 'rxjs/internal/operators';
import { WaitingRoomEventTypeAuthOk, WaitingRoomEventTypeError } from '../../../../modules/devices/waiting-room/shared/waiting-room.model';
import {environment} from '../../../../../environments/environment';
import { AuthorizationService } from 'src/app/core/services/authorization.service';

@Injectable({
    providedIn: 'root',
})
export class SidenavService implements OnDestroy {
    @Output() toggleChanged: EventEmitter<boolean> = new EventEmitter();
    @Output() sectionChanged: EventEmitter<string> = new EventEmitter();

    private isToggled = false;
    private section = '';
    private waitingRoomEventCloser?: () => void;

    constructor(private waitingRoomService: WaitingRoomService, private authService: AuthorizationService) {}

    ngOnDestroy() {
        if (this.waitingRoomEventCloser) {
            this.waitingRoomEventCloser();
        }
    }

    toggle(sidenavOpen: boolean): void {
        this.isToggled = sidenavOpen;
        this.toggleChanged.emit(this.isToggled);
    }

    reset(): void {
        this.sectionChanged.emit(this.section);
    }

    getSections(): SidenavSectionModel[] {
        const sections: SidenavSectionModel[] = [];

        sections.push(new SidenavSectionModel('Dashboard', 'link', 'dashboard', '/dashboard', []));

        if(environment.smartServiceRepoUrl){
            sections.push(
                new SidenavSectionModel('Smart Services', 'toggle', 'design_services', '/smart-services', [
                    new SidenavPageModel('Designs', 'link', 'create', '/smart-services/designs'),
                    new SidenavPageModel('Releases', 'link', 'storage', '/smart-services/releases'),
                ]),
            );
        }


        const processPages = [
            new SidenavPageModel('Designer', 'link', 'create', '/processes/designer'),
            new SidenavPageModel('Repository', 'link', 'storage', '/processes/repository'),
            new SidenavPageModel('Deployments', 'link', 'publish', '/processes/deployments'),
            new SidenavPageModel('Monitor', 'link', 'search', '/processes/monitor'),
        ];

        if(environment.processIoUrl){
            processPages.push( new SidenavPageModel('IO', 'link', 'table_chart', '/processes/io'));
        }

        sections.push(
            new SidenavSectionModel('Processes', 'toggle', 'timeline', '/processes', processPages),
        );

        sections.push(
            new SidenavSectionModel('Exports', 'toggle', 'west', '/exports', [
                new SidenavPageModel('Database', 'link', 'table_chart', '/exports/db'),
                new SidenavPageModel('Broker', 'link', 'call_split', '/exports/broker'),
            ]),
        );

        sections.push(
            new SidenavSectionModel('Analytics', 'toggle', 'bar_chart', '/data', [
                new SidenavPageModel('Operators', 'link', 'code', '/data/operator-repo'),
                new SidenavPageModel('Designer', 'link', 'create', '/data/designer'),
                new SidenavPageModel('Flows', 'link', 'insights', '/data/flow-repo'),
                new SidenavPageModel('Pipelines', 'link', 'analytics', '/data/pipelines'),
            ]),
        );

        const waitingRoom = new SidenavPageModel('Waiting Room', 'link', 'chair', '/devices/waiting-room', '');
        const refreshWaitingRoom = () => {
            this.waitingRoomService.searchDevices('', 1, 0, 'name', 'asc', false).subscribe((value) => {
                if (value && value.total > 0) {
                    waitingRoom.badge = String(value.total);
                }
                if (value && value.total === 0) {
                    waitingRoom.badge = '';
                }
            });
        };

        this.waitingRoomService
            .events(
                (closer) => {
                    this.waitingRoomEventCloser = closer;
                },
                () => {
                    refreshWaitingRoom();
                },
            )
            .pipe(debounceTime(1000))
            .subscribe((msg) => {
                if (msg.type === WaitingRoomEventTypeAuthOk || this.waitingRoomService.eventIsUpdate(msg)) {
                    refreshWaitingRoom();
                }
            });

        sections.push(
            new SidenavSectionModel('Device Management', 'toggle', 'devices', '/devices', [
                new SidenavPageModel('Networks', 'link', 'device_hub', '/devices/networks'),
                waitingRoom,
                new SidenavPageModel('Devices', 'link', 'sensors', '/devices/deviceinstances'),
                new SidenavPageModel('Groups', 'link', 'group_work', '/devices/devicegroups'),
                new SidenavPageModel('Locations', 'link', 'place', '/devices/locations'),
            ]),
        );

        sections.push(
            new SidenavSectionModel('Imports', 'toggle', 'east', '/imports', [
                new SidenavPageModel('Types', 'link', 'api', '/imports/types/list'),
                new SidenavPageModel('Instances', 'link', 'double_arrow', '/imports/instances'),
            ]),
        );

        sections.push(
            new SidenavSectionModel('Metadata', 'toggle', 'web_asset', '/metadata', [
                new SidenavPageModel('Device Classes', 'link', 'devices_other', '/metadata/deviceclasses'),
                new SidenavPageModel('Functions', 'link', 'functions', '/metadata/functions'),
                new SidenavPageModel('Aspects', 'link', 'wallpaper', '/metadata/aspects'),
                new SidenavPageModel('Concepts', 'link', 'category', '/metadata/concepts'),
                new SidenavPageModel('Characteristics', 'link', 'scatter_plot', '/metadata/characteristics'),
                new SidenavPageModel('Device Types', 'link', 'important_devices', '/metadata/devicetypesoverview'),
            ]),
        );

        // Add admin and devloper sections
        if(this.authService.userIsAdmin()) {
            sections.push(
                new SidenavSectionModel('Admin', 'toggle', 'admin_panel_settings', '/admin', [
                    new SidenavPageModel('User & Client Authorization', 'link', 'security', '/admin/authorization'),
                    new SidenavPageModel('Timescale Rules', 'link', 'rule', '/admin/timescale-rules'),
                ])
            );
        }

        if(this.authService.userIsAdmin() || this.authService.userIsDeveloper()) {
            sections.push(
                new SidenavSectionModel('Developer', 'toggle', 'engineering', '/dev', [
                    new SidenavPageModel('API', 'link', 'api', '/dev/api'),
                ])
            );
        }

        return sections;
    }
}
