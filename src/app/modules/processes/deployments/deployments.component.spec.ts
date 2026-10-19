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

import { ProcessDeploymentsComponent } from './deployments.component';
import { DeploymentsService } from './shared/deployments.service';
import { DeploymentsFogFactory } from './shared/deployments-fog.service';
import { DeploymentsModel } from './shared/deployments.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { UtilService } from '../../../core/services/util.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';

const deployment = (id: string, disabled?: boolean): DeploymentsModel =>
    ({ id, name: 'name-' + id, definition_id: 'def-' + id, diagram: '<svg></svg>', online: true, disabled, deploymentTime: new Date(Date.UTC(2026, 0, 2, 10, 0)) }) as DeploymentsModel;

const hub = { id: 'hub-1', name: 'Hub' } as HubModel;

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

    getAll(...args: unknown[]) {
        this.getAllArgs.push(args);
        const [, limit, offset] = args as [string, number, number];
        return of(this.items.slice(offset, offset + limit).map((item) => ({ ...item })));
    }

    getDeployment() {
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

    async function setup(configure: (service: MockDeploymentsService) => void = () => undefined) {
        confirmed = true;
        routeParams = {};
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
                { provide: DeploymentsFogFactory, useValue: { withHubId: () => new MockDeploymentsService() } },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([hub]) } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: (docs: { key: string }[]) => of(new Map(docs.slice(0, 1).map((d) => [d.key, 'Missing: urn:x']))) } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
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

        it('hides the switch item and the status chips of the platform while a fog hub is selected', async () => {
            render();
            component.selectHub(hub, false);
            render();

            expect(rows()[0].querySelector('.status-chip.online')).toBeNull();
            expect(await menuLabels(0)).not.toContain('Switch off');
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

        it('reloads exactly once when the refresh button is clicked', () => {
            render();
            service.getAllArgs = [];

            (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();

            expect(service.getAllArgs.length).toBe(1);
        });

        it('reads every chunk and shows the first page only', () => {
            service.items = Array.from({ length: 60 }, (_, i) => deployment('d' + i));
            render();

            expect(service.getAllArgs.map((args) => [args[1], args[2]])).toEqual([[50, 0], [50, 50]]);
            expect(component.dataSource.data.length).toBe(60);
            expect(rows().length).toBe(20);
        });

        it('asks for the generated deployments only when the filter is on', () => {
            render();
            service.getAllArgs = [];

            component.filterItems(true);

            expect(service.getAllArgs.length).toBe(1);
            expect(service.getAllArgs[0][5]).toBe('');
        });

        it('sends the sort of the column header to the server', () => {
            render();
            service.getAllArgs = [];

            component.matSortChange({ active: 'name', direction: 'asc' });

            expect(service.getAllArgs[0].slice(3, 5)).toEqual(['name', 'asc']);
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
            expect(service.getAllArgs.length).toBe(1);
            expect(snackBar.open).toHaveBeenCalledWith('Deployments deleted successfully.', undefined, { duration: 2000 });
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
});
