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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard';
import { of, Subject } from 'rxjs';

import { ProcessDeploymentsComponent } from './deployments.component';
import { DeploymentsService } from './shared/deployments.service';
import { DeploymentsFogFactory } from './shared/deployments-fog.service';
import { DeploymentsModel } from './shared/deployments.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { UtilService } from '../../../core/services/util.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';

const deployment = (id: string, disabled?: boolean): DeploymentsModel =>
    ({ id, name: 'name-' + id, definition_id: 'def-' + id, diagram: '<svg></svg>', online: true, disabled }) as DeploymentsModel;

const hub = { id: 'hub-1', name: 'Hub' } as HubModel;

class MockDeploymentsService {
    result: { disabled: boolean } | null = null;
    calls: { id: string; disabled: boolean }[] = [];
    items: DeploymentsModel[] = [deployment('on'), deployment('off', true)];

    userHasDeleteAuthorization(): boolean {
        return true;
    }

    getAll() {
        return of(this.items);
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

    beforeEach(waitForAsync(() => {
        confirmed = true;
        openConfirmDialog = jasmine.createSpy('openConfirmDialog').and.callFake(() => ({ afterClosed: () => of(confirmed) }));
        snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        searchText = new Subject<string>();
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CommonModule, ReactiveFormsModule, NoopAnimationsModule, MatSlideToggleModule, MatCheckboxModule, MatMenuModule, MatTooltipModule, ProcessDeploymentsComponent],
            providers: [
                { provide: DeploymentsService, useClass: MockDeploymentsService },
                { provide: DialogsService, useValue: { openConfirmDialog } },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: SearchbarService, useValue: { currentSearchText: searchText, changeMessage: () => undefined } },
                { provide: ResponsiveService, useValue: { getActiveMqAlias: () => 'md', observeMqAlias: () => of() } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: ClipboardService, useValue: {} },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { queryParamMap: { get: () => null } }, queryParamMap: of({ get: () => null }) },
                },
                { provide: DeploymentsFogFactory, useValue: { withHubId: () => new MockDeploymentsService() } },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([hub]) } },
                { provide: MetadataExistenceService, useValue: {} },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ProcessDeploymentsComponent);
        component = fixture.componentInstance;
        service = TestBed.inject(DeploymentsService) as unknown as MockDeploymentsService;
    }));

    // the list is loaded when the search emits, which the real searchbar does asynchronously
    function render(): void {
        fixture.detectChanges();
        searchText.next('');
        fixture.detectChanges();
    }

    function toggleChange(checked: boolean): MatSlideToggleChange {
        return { checked, source: { checked } } as MatSlideToggleChange;
    }

    function toggles(): HTMLElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('mat-slide-toggle'));
    }

    it('shows an on/off toggle per deployment, on only for the ones that are not disabled', () => {
        render();

        const states = toggles().map((t) => t.querySelector('button')?.getAttribute('aria-checked'));
        expect(states).toEqual(['true', 'false']);
    });

    it('marks a disabled deployment and disables its run button', () => {
        render();

        const tiles: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-grid-tile'));
        expect(tiles.map((t) => t.classList.contains('deployment-disabled'))).toEqual([false, true]);
        const runButtons = tiles.map((t) => t.querySelector<HTMLButtonElement>('button[matTooltip="Run"]'));
        expect(runButtons.map((b) => b?.disabled)).toEqual([false, true]);
    });

    it('hides the toggle while a fog hub is selected', () => {
        render();
        component.selectHub(hub, false);
        render();

        expect(toggles().length).toBe(0);
    });

    it('asks for confirmation before switching off and then sends the change', () => {
        render();
        service.result = { disabled: true };
        const item = component.repoItems.at(0);

        component.toggleDeploymentEnabled(item, toggleChange(false));

        expect(openConfirmDialog).toHaveBeenCalledTimes(1);
        expect(service.calls).toEqual([{ id: 'on', disabled: true }]);
        expect(item.value.disabled).toBeTrue();
    });

    it('does not call the service and sets the toggle back when the confirmation is declined', () => {
        render();
        confirmed = false;
        const change = toggleChange(false);

        component.toggleDeploymentEnabled(component.repoItems.at(0), change);

        expect(service.calls).toEqual([]);
        expect(component.repoItems.at(0).value.disabled).toBeFalse();
        expect(change.source.checked).toBeTrue();
    });

    it('switches on without a confirmation', () => {
        render();
        service.result = { disabled: false };
        const item = component.repoItems.at(1);

        component.toggleDeploymentEnabled(item, toggleChange(true));

        expect(openConfirmDialog).not.toHaveBeenCalled();
        expect(service.calls).toEqual([{ id: 'off', disabled: false }]);
        expect(item.value.disabled).toBeFalse();
    });

    it('shows an error and sets the toggle back when the service fails', () => {
        render();
        service.result = null;
        const change = toggleChange(false);

        component.toggleDeploymentEnabled(component.repoItems.at(0), change);

        expect(snackBar.open).toHaveBeenCalledWith('Error while switching the deployment off! !', 'close', { panelClass: 'snack-bar-error' });
        expect(component.repoItems.at(0).value.disabled).toBeFalse();
        expect(change.source.checked).toBeTrue();
    });
});
