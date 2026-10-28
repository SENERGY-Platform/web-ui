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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard';
import { Observable, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { ProcessDeploymentsComponent } from './deployments.component';
import { DeploymentsService } from './shared/deployments.service';
import { DeploymentsModel } from './shared/deployments.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { UtilService } from '../../../core/services/util.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { UrlStateService } from '../../../core/services/url-state.service';

const deployment = (id: string, disabled?: boolean, networkId?: string): DeploymentsModel =>
    ({ id, name: 'name-' + id, definition_id: 'def-' + id, diagram: '<svg></svg>', online: true, disabled, network_id: networkId, deploymentTime: new Date(Date.UTC(2026, 0, 2, 10, 0)) }) as DeploymentsModel;

const hub = { id: 'hub-1', name: 'Hub' } as HubModel;

/** Reads from `params`, records the writes; the parsing rules themselves are pinned in the UrlStateService spec. */
class FakeUrlState {
    params: Record<string, string> = {};
    set = jasmine.createSpy('set');
    setPage = jasmine.createSpy('setPage');
    setSort = jasmine.createSpy('setSort');

    get(key: string): string | null {
        return this.params[key] ?? null;
    }

    getShown(key: string, fallback: boolean): boolean {
        const value = this.get(key);
        return value === 'show' ? true : value === 'hide' ? false : fallback;
    }

    getPage(): number {
        return Number(this.get('page') ?? 0);
    }

    getSort(active: string, direction: string): { active: string; direction: string } {
        return { active: this.get('sort') ?? active, direction: this.get('dir') ?? direction };
    }
}

class MockDeploymentsService {
    result: { disabled: boolean } | null = null;
    calls: { id: string; disabled: boolean }[] = [];
    items: DeploymentsModel[] = [deployment('on'), deployment('off', true)];
    deleteRight = true;
    getAllArgs: unknown[][] = [];
    deleted: string[] = [];
    single: DeploymentsModel | null = null;
    diagramRequests: string[] = [];

    userHasDeleteAuthorization(): boolean {
        return this.deleteRight;
    }

    listOfNetworks(...args: unknown[]) {
        this.getAllArgs.push(args);
        const [, limit, offset] = args as [string, number, number];
        return of(this.items.slice(offset, offset + limit).map((item) => ({ ...item })));
    }

    getDeploymentOfNetworks() {
        return of(this.single);
    }

    getDeploymentDiagramXml(id: string) {
        this.diagramRequests.push(id);
        return of('<bpmn/>');
    }

    v2deleteDeployment(id: string) {
        this.deleted.push(id);
        return of({ status: 200 });
    }

    verification: Observable<boolean> = of(false);

    checkForDeletedDeploymentWithRetries() {
        return this.verification;
    }

    setDeploymentDisabled(id: string, disabled: boolean) {
        this.calls.push({ id, disabled });
        return of(this.result);
    }
}

describe('ProcessDeploymentsComponent', () => {
    let component: ProcessDeploymentsComponent;
    let fixture: ComponentFixture<ProcessDeploymentsComponent>;
    let service: MockDeploymentsService;
    let confirmed: boolean;
    let openConfirmDialog: jasmine.Spy;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    let searchText: Subject<string>;
    let routeParams: Record<string, string>;
    let urlState: FakeUrlState;

    async function setup(configure: (service: MockDeploymentsService) => void = () => undefined) {
        confirmed = true;
        routeParams = {};
        urlState = new FakeUrlState();
        openConfirmDialog = jasmine.createSpy('openConfirmDialog').and.callFake(() => ({ afterClosed: () => of(confirmed) }));
        snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        searchText = new Subject<string>();
        const params = { get: (key: string) => routeParams[key] ?? null };
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProcessDeploymentsComponent],
            providers: [
                { provide: DeploymentsService, useClass: MockDeploymentsService },
                { provide: DialogsService, useValue: { openConfirmDialog, openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: SearchbarService, useValue: { currentSearchText: searchText, changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: ClipboardService, useValue: {} },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true), navigateByUrl: () => Promise.resolve(true) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) } },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([hub]) } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: (docs: { key: string }[]) => of(new Map(docs.slice(0, 1).map((d) => [d.key, 'Missing: urn:x']))) } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
                { provide: UrlStateService, useValue: urlState },
            ],
        }).compileComponents();
        service = TestBed.inject(DeploymentsService) as unknown as MockDeploymentsService;
        configure(service);
        fixture = TestBed.createComponent(ProcessDeploymentsComponent);
        component = fixture.componentInstance;
    }

    // the list is loaded when the search emits, which the real searchbar does asynchronously
    function render(): void {
        fixture.detectChanges();
        searchText.next('');
        fixture.detectChanges();
    }

    const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));

    async function menuLabels(row: number): Promise<string[]> {
        const buttons = fixture.nativeElement.querySelectorAll('tr[mat-row] button[aria-label="Actions"]');
        (buttons[row] as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/^\w+ /, ''));
    }

    describe('rows', () => {
        beforeEach(() => setup());

        it('shows name, a status chip per deployment and the deployment date', () => {
            render();

            const [on, off] = rows();
            expect(on.querySelector('.name-cell')?.textContent).toContain('name-on');
            expect(on.querySelector('.status-chip.online')?.textContent).toContain('Switched on');
            expect(off.querySelector('.status-chip:not(.online)')?.textContent).toContain('Switched off');
            expect(on.querySelector('.muted')?.textContent).toContain('02.01.2026');
            expect(on.querySelector('img.svg-preview')).not.toBeNull();
        });

        it('marks a disabled deployment', () => {
            render();

            expect(rows().map((r) => r.classList.contains('deployment-disabled'))).toEqual([false, true]);
        });

        it('shows a warning chip for missing dependencies that opens the reasons', () => {
            service.items = [{ ...deployment('on'), online: false, offline_reasons: [] } as DeploymentsModel];
            render();
            const open = spyOn(component, 'showOfflineReasons');

            const chip = rows()[0].querySelector('button.status-chip.warning') as HTMLButtonElement;
            chip.click();

            expect(chip.textContent).toContain('Missing dependencies');
            expect(open).toHaveBeenCalledTimes(1);
        });

        it('offers the menu actions in the fixed order with delete last', async () => {
            render();

            expect(await menuLabels(0)).toEqual(['Run', 'Show running', 'Show history', 'Copy deployment', 'Copy endpoint', 'Switch off', 'Delete']);
        });

        it('offers switching on for a switched off deployment and disables its run item', async () => {
            render();

            const labels = await menuLabels(1);
            expect(labels).toContain('Switch on');
            const run = Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).find((b) => (b.textContent || '').includes('Run')) as HTMLButtonElement;
            expect(run.disabled).toBeTrue();
        });

        it('hides the switch item and the switch chip of a deployment that runs on a hub', async () => {
            service.items = [deployment('on-hub', false, hub.id)];
            render();

            expect(rows()[0].querySelector('.status-chip.online')).toBeNull();
            expect(await menuLabels(0)).not.toContain('Switch off');
        });

        it('shows on each deployment whether it runs on the platform or on which hub', () => {
            service.items = [deployment('cloud-deployment'), deployment('hub-deployment', false, hub.id), deployment('unknown-hub', false, 'hub-x')];
            render();

            const labels = rows().map((r) => r.querySelector('.network-cell')?.textContent?.replace(/\s+/g, ' ').trim());
            expect(labels).toEqual(['cloud Platform', 'router Hub', 'router hub-x']);
        });
    });

    describe('without the delete right', () => {
        beforeEach(() => setup((s) => (s.deleteRight = false)));

        it('keeps the selection column for the bulk delete and hides only the single delete item', async () => {
            render();

            expect(component.displayedColumns).toContain('select');
            expect(await menuLabels(0)).not.toContain('Delete');
        });
    });

    describe('loading', () => {
        beforeEach(() => setup());

        // one load reads chunks until an empty one, so loads are counted by their first chunk
        const firstChunks = () => service.getAllArgs.filter((args) => args[2] === 0);

        it('reloads exactly once when the refresh button is clicked', () => {
            render();
            service.getAllArgs = [];

            (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();

            expect(firstChunks().length).toBe(1);
        });

        it('reads every chunk and shows the first page only', () => {
            service.items = Array.from({ length: 60 }, (_, i) => deployment('d' + i));
            render();

            expect(service.getAllArgs.map((args) => [args[1], args[2]])).toEqual([[50, 0], [50, 50], [50, 100]]);
            expect(component.dataSource.data.length).toBe(60);
            expect(rows().length).toBe(20);
        });

        it('reads on after a chunk the engine wrapper shortened', () => {
            // the wrapper drops deployments without a virtual id, so the first chunk holds 49 of 50 rows
            service.items = Array.from({ length: 60 }, (_, i) => deployment('d' + i));
            const getAll = service.listOfNetworks.bind(service);
            service.listOfNetworks = (...args: unknown[]) => getAll(...args).pipe(map((page) => (args[2] === 0 ? page.slice(1) : page)));
            render();

            expect(component.dataSource.data.length).toBe(59);
        });

        it('asks for the generated deployments only when the filter is on', () => {
            render();
            service.getAllArgs = [];

            component.filterItems(true);

            expect(firstChunks().length).toBe(1);
            expect(firstChunks()[0][5]).toBe('');
        });

        it('sends the sort of the column header to the server', () => {
            render();
            service.getAllArgs = [];

            component.matSortChange({ active: 'name', direction: 'asc' });

            expect(service.getAllArgs[0].slice(3, 5)).toEqual(['name', 'asc']);
        });

        it('lists the deployments of all networks until one is selected', () => {
            render();
            component.selectNetwork('cloud', false);
            component.selectNetwork(hub.id, false);
            component.selectNetwork(null, false);

            expect(firstChunks().map((args) => args[6])).toEqual([undefined, 'cloud', 'hub-1', undefined]);
        });

        it('names the selected network on the filter button', () => {
            render();
            const label = () => component.networkFilterLabel;
            expect(label()).toBe('All networks');
            component.selectNetwork('cloud', false);
            expect(label()).toBe('Senergy-Platform');
            component.selectNetwork(hub.id, false);
            expect(label()).toBe('Hub');
        });

        it('shows the no-match empty state while a network is selected', () => {
            service.items = [];
            render();
            component.selectNetwork(hub.id, false);
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('senergy-empty-state .empty-title')?.textContent).toBe('No matching deployments');
        });

        it('shows the empty state with its no-match variant while a filter is on', () => {
            service.items = [];
            render();
            expect(fixture.nativeElement.querySelector('senergy-empty-state .empty-title')?.textContent).toBe('No deployments yet');

            component.filterItems(true);
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('senergy-empty-state .empty-title')?.textContent).toBe('No matching deployments');
        });

        it('checks the metadata of the page shown only after it was asked for', () => {
            service.items = Array.from({ length: 30 }, (_, i) => deployment('d' + i));
            render();
            expect(service.diagramRequests).toEqual([]);

            component.checkMissingMetadata();
            fixture.detectChanges();

            expect(service.diagramRequests.length).toBe(20);
            expect(component.metadataWarnings.get('d0')).toBe('Missing: urn:x');
        });
    });

    describe('single deployment view', () => {
        beforeEach(() =>
            setup((s) => {
                s.single = deployment('only');
            }),
        );

        it('reads that deployment only and shows the filter chip', () => {
            routeParams['deploymentId'] = 'only';
            render();

            expect(service.getAllArgs.length).toBe(0);
            expect(rows().length).toBe(1);
            expect(fixture.nativeElement.querySelector('mat-chip')?.textContent).toContain('Deployment ID: only');
        });
    });

    describe('bulk delete', () => {
        beforeEach(() => setup());

        it('deletes every selected deployment once and reloads once', () => {
            render();
            component.selection.select(component.dataSource.data[0], component.dataSource.data[1]);
            service.getAllArgs = [];

            component.deleteMultipleItems();

            expect(service.deleted).toEqual(['on', 'off']);
            expect(service.getAllArgs.filter((args) => args[2] === 0).length).toBe(1);
            expect(snackBar.open).toHaveBeenCalledWith('Deployments deleted successfully.', undefined, { duration: 2000 });
        });

        it('reports a single delete on a hub as sent', () => {
            service.items = [deployment('on-hub', false, hub.id)];
            render();

            component.deleteDeployment(component.dataSource.data[0]);

            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Delete sent to the hub; the deployment disappears once the hub confirms.');
        });

        it('reports a delete on a hub as sent, not as done', () => {
            service.items = [deployment('on-hub', false, hub.id)];
            render();
            component.selection.select(component.dataSource.data[0]);

            component.deleteMultipleItems();

            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Delete sent to the hub; the deployment disappears once the hub confirms.');
        });
    });

    describe('while a delete is verified', () => {
        beforeEach(() => setup());

        it('hides the rows and clears the selection until the bulk delete is verified, so it cannot be sent twice', () => {
            render();
            const verified = new Subject<boolean>();
            service.verification = verified;
            component.selection.select(component.dataSource.data[0]);

            component.deleteMultipleItems();

            expect(component.ready).toBeFalse();
            expect(component.selection.selected.length).toBe(0);
            expect(service.deleted).toEqual(['on']);
            verified.next(false);
            verified.complete();
            expect(component.ready).toBeTrue();
        });

        it('hides the rows while a single delete is verified', () => {
            render();
            const verified = new Subject<boolean>();
            service.verification = verified;

            component.deleteDeployment(component.dataSource.data[0]);

            expect(component.ready).toBeFalse();
            verified.next(false);
            expect(component.ready).toBeTrue();
        });
    });

    describe('checking the metadata again', () => {
        beforeEach(() => setup());

        it('answers every click with a snack bar and reads the page again', () => {
            service.items = [deployment('a'), deployment('b')];
            render();

            component.checkMissingMetadata();
            component.checkMissingMetadata();

            expect(service.diagramRequests.length).toBe(4);
            expect(snackBar.open).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledWith('1 deployment on this page reference missing metadata.', undefined, { duration: 2000 });
        });
    });

    describe('overlapping metadata checks', () => {
        beforeEach(() => setup());

        it('keeps the check running until the last one has answered', () => {
            render();
            const first = new Subject<string>();
            const second = new Subject<string>();
            service.items = [deployment('a')];
            render();
            spyOn(service, 'getDeploymentDiagramXml').and.returnValues(first, second);

            component.checkMissingMetadata();
            component.checkMissingMetadata();
            expect(component.metadataCheckRunning).toBeTrue();

            first.next('<bpmn/>');
            first.complete();
            expect(component.metadataCheckRunning).toBeTrue();

            second.next('<bpmn/>');
            second.complete();
            expect(component.metadataCheckRunning).toBeFalse();
        });
    });

    describe('switching on and off', () => {
        beforeEach(() => setup());

        it('asks for confirmation before switching off and then sends the change', () => {
            render();
            service.result = { disabled: true };
            const item = component.dataSource.data[0];

            component.toggleDeploymentEnabled(item);

            expect(openConfirmDialog).toHaveBeenCalledTimes(1);
            expect(service.calls).toEqual([{ id: 'on', disabled: true }]);
            expect(item.disabled).toBeTrue();
        });

        it('does not call the service when the confirmation is declined', () => {
            render();
            confirmed = false;
            const item = component.dataSource.data[0];

            component.toggleDeploymentEnabled(item);

            expect(service.calls).toEqual([]);
            expect(item.disabled).toBeFalse();
        });

        it('switches on without a confirmation', () => {
            render();
            service.result = { disabled: false };
            const item = component.dataSource.data[1];

            component.toggleDeploymentEnabled(item);

            expect(openConfirmDialog).not.toHaveBeenCalled();
            expect(service.calls).toEqual([{ id: 'off', disabled: false }]);
            expect(item.disabled).toBeFalse();
        });

        it('shows an error and keeps the state when the service fails', () => {
            render();
            service.result = null;
            const item = component.dataSource.data[0];

            component.toggleDeploymentEnabled(item);

            expect(snackBar.open).toHaveBeenCalledWith('Error while switching the deployment off! !', 'close', { panelClass: 'snack-bar-error' });
            expect(item.disabled).toBeFalse();
        });
    });

    describe('view state in the URL', () => {
        beforeEach(() => setup((s) => (s.items = Array.from({ length: 60 }, (_, i) => deployment('d' + i)))));

        const firstChunks = () => service.getAllArgs.filter((args) => args[2] === 0);
        const shownNames = () => rows().map((r) => r.querySelector('.name-cell')?.textContent?.trim());

        it('restores the generated filter, the sort and the page before the first load and loads once', () => {
            urlState.params = { generated: 'show', sort: 'name', dir: 'asc', page: '1' };
            render();

            expect(firstChunks().length).toBe(1);
            expect(firstChunks()[0].slice(3, 6)).toEqual(['name', 'asc', '']);
            expect(component.showGenerated).toBeTrue();
            expect(component.dataSource.paginator?.pageIndex).toBe(1);
            expect(shownNames()[0]).toBe('name-d20');
            expect(urlState.set).not.toHaveBeenCalled();
            expect(urlState.setPage).not.toHaveBeenCalled();
        });

        it('takes only a sortable column with a direction from the URL', () => {
            urlState.params = { sort: 'diagram', dir: 'asc' };
            render();

            expect(firstChunks()[0].slice(3, 5)).toEqual(['deploymentTime', 'desc']);
        });

        it('moves a page beyond the end to the last page and writes it', () => {
            urlState.params = { page: '7' };
            render();

            expect(component.dataSource.paginator?.pageIndex).toBe(2);
            expect(shownNames()[0]).toBe('name-d40');
            expect(urlState.setPage).toHaveBeenCalledOnceWith(2);
        });

        it('returns to the first page on a later search', () => {
            urlState.params = { page: '1' };
            render();

            searchText.next('d');
            fixture.detectChanges();

            expect(component.dataSource.paginator?.pageIndex).toBe(0);
            expect(urlState.setPage).toHaveBeenCalledWith(0);
        });

        it('writes a page change, a sort change and a filter change', async () => {
            render();
            // the data source hands the length to the paginator asynchronously
            await fixture.whenStable();

            component.dataSource.paginator?.nextPage();
            expect(urlState.setPage).toHaveBeenCalledWith(1);

            component.matSortChange({ active: 'name', direction: 'asc' });
            expect(urlState.setSort).toHaveBeenCalledOnceWith({ active: 'name', direction: 'asc' }, 'deploymentTime', 'desc');

            component.filterItems(true);
            expect(urlState.set).toHaveBeenCalledOnceWith({ generated: 'show', page: null });
        });

        it('takes the platform from hubId without rewriting the URL', () => {
            const router = TestBed.inject(Router);
            const navigate = spyOn(router, 'navigate').and.resolveTo(true);
            routeParams['hubId'] = 'cloud';
            render();
            expect(firstChunks().map((args) => args[6])).toEqual(['cloud']);
            expect(navigate).not.toHaveBeenCalled();
        });

        it('lists all networks when hubId names a hub that is gone', () => {
            const router = TestBed.inject(Router);
            const navigate = spyOn(router, 'navigate').and.resolveTo(true);
            routeParams['hubId'] = 'hub-gone';
            render();

            expect(component.networkFilter).toBeNull();
            expect(firstChunks().map((args) => args[6])).toEqual([undefined]);
            expect(navigate.calls.mostRecent().args[1]?.queryParams).toEqual({ hubId: null, deploymentId: null });
        });
    });
});
