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

import {EventEmitter, Injectable, Output} from '@angular/core';

import {SidenavSectionModel} from './sidenav-section.model';
import {SidenavPageModel} from './sidenav-page.model';

@Injectable({
    providedIn: 'root',
})
export class SidenavService {
    @Output() toggleChanged: EventEmitter<boolean> = new EventEmitter();
    @Output() sectionChanged: EventEmitter<string> = new EventEmitter();

    private isToggled = false;
    private section = '';

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

        sections.push(new SidenavSectionModel('Processes', 'toggle', 'timeline', '/processes', [
            new SidenavPageModel('Designer', 'link', 'create', '/processes/designer'),
            new SidenavPageModel('Repository', 'link', 'storage', '/processes/repository'),
            new SidenavPageModel('Deployments', 'link', 'publish', '/processes/deployments'),
            new SidenavPageModel('Monitor', 'link', 'search', '/processes/monitor')
        ]));

        sections.push(new SidenavSectionModel('Exports', 'link', 'west', '/exports', []));

        sections.push(new SidenavSectionModel('Analytics', 'toggle', 'bar_chart', '/data', [
            new SidenavPageModel('Operators', 'link', 'storage', '/data/operator-repo'),
            new SidenavPageModel('Designer', 'link', 'create', '/data/designer'),
            new SidenavPageModel('Flows', 'link', 'insights', '/data/flow-repo'),
            new SidenavPageModel('Pipelines', 'link', 'analytics', '/data/pipelines')
        ]));

        sections.push(new SidenavSectionModel('Device Management', 'toggle', 'devices', '/devices', [
            new SidenavPageModel('Locations', 'link', 'place', '/devices/locations'),
            new SidenavPageModel('Hubs', 'link', 'device_hub', '/devices/networks'),
            new SidenavPageModel('Devices', 'link', 'important_devices', '/devices/deviceinstances'),
            new SidenavPageModel('Device Groups', 'link', 'group_work', '/devices/devicegroups')
        ]));

        sections.push(new SidenavSectionModel('Imports', 'toggle', 'east', '/imports', [
            new SidenavPageModel('Types', 'link', 'storage', '/imports/types/list'),
            new SidenavPageModel('Instances', 'link', 'cloud_upload', '/imports/instances')
        ]));

        sections.push(new SidenavSectionModel('Metadata', 'toggle', 'folder_open', '/metadata', [
            new SidenavPageModel('Device Classes', 'link', 'devices_other', '/metadata/deviceclasses'),
            new SidenavPageModel('Functions', 'link', 'functions', '/metadata/functions'),
            new SidenavPageModel('Aspects', 'link', 'wallpaper', '/metadata/aspects'),
            new SidenavPageModel('Concepts', 'link', 'category', '/metadata/concepts'),
            new SidenavPageModel('Characteristics', 'link', 'scatter_plot', '/metadata/characteristics'),
            new SidenavPageModel('Device Types', 'link', 'devices', '/metadata/devicetypesoverview')
        ]));

        return sections;
    }

    constructor() { }
}


