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

import { SidenavComponent } from './sidenav.component';
import { SidenavSectionModel } from './shared/sidenav-section.model';
import { SidenavPageModel } from './shared/sidenav-page.model';

// isPageActive/matchesPage only touch currentUrl and the page/section arguments -- none of
// the constructor's injected services -- so the component is built directly rather than
// through TestBed, without needing to satisfy SidenavService's large dependency graph.
describe('SidenavComponent.isPageActive', () => {
    let component: SidenavComponent;

    beforeEach(() => {
        component = new SidenavComponent({} as any, {} as any, {} as any, {} as any);
    });

    it('matches a page whose state exactly equals the current url', () => {
        const page = new SidenavPageModel('Environments', 'link', 'icon', '/environments');
        const section = new SidenavSectionModel('Simulation', 'toggle', 'icon', '/environments', [page]);
        component.currentUrl = '/environments';

        expect(component.isPageActive(page, section)).toBe(true);
    });

    it('matches a page whose state is a path-segment prefix of the current url', () => {
        const page = new SidenavPageModel('Environments', 'link', 'icon', '/environments');
        const section = new SidenavSectionModel('Simulation', 'toggle', 'icon', '/environments', [page]);
        component.currentUrl = '/environments/e1';

        expect(component.isPageActive(page, section)).toBe(true);
    });

    it('does not match a page whose state is only a string prefix, not a path-segment prefix', () => {
        const page = new SidenavPageModel('Environments', 'link', 'icon', '/environments');
        const section = new SidenavSectionModel('Simulation', 'toggle', 'icon', '/environments', [page]);
        component.currentUrl = '/environments-extra';

        expect(component.isPageActive(page, section)).toBe(false);
    });

    // This is the bug being fixed: /environments and /environments/datasets are both
    // prefixes of /environments/datasets, so a plain prefix match highlights both.
    it('yields to a sibling page with a longer matching state', () => {
        const environmentsPage = new SidenavPageModel('Environments', 'link', 'icon', '/environments');
        const datasetsPage = new SidenavPageModel('Datasets', 'link', 'icon', '/environments/datasets');
        const section = new SidenavSectionModel('Simulation', 'toggle', 'icon', '/environments', [environmentsPage, datasetsPage]);
        component.currentUrl = '/environments/datasets';

        expect(component.isPageActive(environmentsPage, section)).toBe(false);
        expect(component.isPageActive(datasetsPage, section)).toBe(true);
    });

    it('keeps the shorter page active on a route the longer sibling does not match', () => {
        const environmentsPage = new SidenavPageModel('Environments', 'link', 'icon', '/environments');
        const datasetsPage = new SidenavPageModel('Datasets', 'link', 'icon', '/environments/datasets');
        const section = new SidenavSectionModel('Simulation', 'toggle', 'icon', '/environments', [environmentsPage, datasetsPage]);
        component.currentUrl = '/environments/e1';

        expect(component.isPageActive(environmentsPage, section)).toBe(true);
        expect(component.isPageActive(datasetsPage, section)).toBe(false);
    });
});
