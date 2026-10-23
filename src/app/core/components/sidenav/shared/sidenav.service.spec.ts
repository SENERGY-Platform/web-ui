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

import { SidenavService } from './sidenav.service';
import { SidenavSectionModel } from './sidenav-section.model';
import { SidenavPageModel } from './sidenav-page.model';

// titleFor() only reads the loaded sections, so the service is built without its large dependency graph.
describe('SidenavService.titleFor', () => {
    let service: SidenavService;

    beforeEach(() => {
        service = Object.create(SidenavService.prototype) as SidenavService;
        (service as unknown as { sections: SidenavSectionModel[] }).sections = [
            new SidenavSectionModel('Dashboard', 'link', 'dashboard', '/dashboard', []),
            new SidenavSectionModel('Developer', 'toggle', 'engineering', '/dev', [new SidenavPageModel('API Docs', 'link', 'api', '/dev/api/docs')]),
            new SidenavSectionModel('Device Management', 'toggle', 'devices', '/devices', [
                new SidenavPageModel('Devices', 'link', 'sensors', '/devices/deviceinstances'),
            ]),
            new SidenavSectionModel('Simulation', 'toggle', 'icon', '/environments', [
                new SidenavPageModel('Environments', 'link', 'icon', '/environments'),
                new SidenavPageModel('Datasets', 'link', 'icon', '/environments/datasets'),
            ]),
        ];
    });

    it('names the section and the longest matching page', () => {
        expect(service.titleFor('/environments/datasets')).toEqual(['Simulation', 'Datasets']);
        expect(service.titleFor('/environments/env-1')).toEqual(['Simulation', 'Environments']);
    });

    it('names only the section on a route below it that no page covers', () => {
        expect(service.titleFor('/devices/waiting-room')).toEqual(['Device Management']);
    });

    it('matches whole path segments only', () => {
        expect(service.titleFor('/devices')).toEqual(['Device Management']);
        expect(service.titleFor('/developer')).toEqual([]);
    });

    it('names a link section without pages by itself', () => {
        expect(service.titleFor('/dashboard')).toEqual(['Dashboard']);
    });
});

describe('SidenavService.setupSmartServiceSection', () => {
    function serviceWith(designsRead: boolean, requestsRead: boolean): SidenavService {
        const service = Object.create(SidenavService.prototype) as SidenavService;
        Object.assign(service, {
            smartServiceDesignService: { userHasReadAuthorization: () => designsRead },
            contentReviewService: { userHasReadAuthorization: () => requestsRead },
        });
        return service;
    }

    it('adds Requests as the fourth entry with the read right on the content review service', () => {
        const pages = serviceWith(true, true).setupSmartServiceSection().pages;

        expect(pages.map((page) => page.name)).toEqual(['Designs', 'Releases', 'Instances', 'Requests']);
        expect(pages[3].state).toBe('/smart-services/requests');
    });

    it('leaves Requests out without that right, whatever the right on the smart service repository is', () => {
        const pages = serviceWith(true, false).setupSmartServiceSection().pages;

        expect(pages.map((page) => page.name)).toEqual(['Designs', 'Releases', 'Instances']);
    });

    it('shows Requests to a user who may not read the repository', () => {
        const pages = serviceWith(false, true).setupSmartServiceSection().pages;

        expect(pages.map((page) => page.name)).toEqual(['Requests']);
    });
});
