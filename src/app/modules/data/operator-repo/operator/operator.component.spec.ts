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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {By} from '@angular/platform-browser';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MtxSelectModule} from '@ng-matero/extensions/select';
import {of, Subject, throwError} from 'rxjs';
import {AuthorizationService} from '../../../../core/services/authorization.service';
import {DialogsService} from '../../../../core/services/dialogs.service';
import {PermissionsService} from '../../../permissions/shared/permissions.service';
import {OperatorComponent} from './operator.component';
import {OperatorPortsComponent} from '../ports-editor/operator-ports.component';
import {OperatorRepoService} from '../shared/operator-repo.service';
import {OperatorModel} from '../shared/operator.model';

const text = 'https://schema.org/Text';

/** Like the backend answers: versions without port lists, no top-level outputs or config. */
function operatorWithVersions(): OperatorModel {
    return {
        _id: 'op1',
        name: 'Op',
        image: 'img:4',
        description: 'd',
        deploymentType: 'cloud',
        userId: 'test',
        inputs: [{name: 'a', type: text}],
        outputs: undefined,
        config_values: undefined,
        version: 3,
        versions: [
            {version: 'v1.0.0', image: 'img:1'},
            {version: 'v1.2.0', image: 'img:3', inputs: [{name: 'a', type: text}], deprecated: true},
            {version: 'v1.10.0', image: 'img:4', inputs: [{name: 'a', type: text}], outputs: [{name: 'o', type: text}]},
        ],
    } as OperatorModel;
}

/** The highest label is deprecated, so the repository's top level and current version are v1.1.0. */
function operatorWithDeprecatedHighest(): OperatorModel {
    return {
        _id: 'op3', name: 'Dep', image: 'img:2', description: 'd', deploymentType: 'cloud', userId: 'test',
        inputs: [{name: 'a', type: text}], outputs: undefined, config_values: undefined, version: 5,
        versions: [
            {version: 'v1.0.0', image: 'img:1'},
            {version: 'v1.1.0', image: 'img:2', inputs: [{name: 'a', type: text}]},
            {version: 'v2.0.0', image: 'img:3', deprecated: true},
        ],
    } as OperatorModel;
}

function operatorWithoutVersions(): OperatorModel {
    return {
        _id: 'op2', name: 'Plain', image: 'img:1', description: undefined, deploymentType: 'local', userId: 'test',
        inputs: [{name: 'a', type: 'float'}], outputs: [{name: 'o', type: 'float'}], config_values: [{name: 'c', type: 'string'}],
    } as OperatorModel;
}

describe('OperatorComponent', () => {
    let fixture: ComponentFixture<OperatorComponent>;
    let component: OperatorComponent;
    let service: jasmine.SpyObj<OperatorRepoService>;
    let dialogs: jasmine.SpyObj<DialogsService>;
    let router: jasmine.SpyObj<Router>;
    let snack: jasmine.Spy;
    let served: OperatorModel | null;
    let routeId: string | null;

    const el = () => fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(el().querySelectorAll('.version-row')) as HTMLElement[];
    const click = (selector: string) => {
        (el().querySelector(selector) as HTMLButtonElement).click();
        fixture.detectChanges();
    };

    function create(operator: OperatorModel | null) {
        served = operator;
        routeId = operator?._id ?? null;
        fixture = TestBed.createComponent(OperatorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<OperatorRepoService>('OperatorRepoService',
            ['getOperator', 'saveOperator', 'putOperatorVersion', 'deleteOperatorVersion']);
        service.getOperator.and.callFake(() => of(served === null ? null : JSON.parse(JSON.stringify(served))));
        service.saveOperator.and.returnValue(of({} as any));
        service.putOperatorVersion.and.returnValue(of({}));
        service.deleteOperatorVersion.and.returnValue(of({}));
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        dialogs = jasmine.createSpyObj<DialogsService>('DialogsService', ['openDeleteDialog']);
        dialogs.openDeleteDialog.and.returnValue({afterClosed: () => of(true)} as any);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [OperatorComponent, OperatorPortsComponent],
            imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule,
                MtxSelectModule],
            providers: [
                provideNoopAnimations(),
                {provide: OperatorRepoService, useValue: service},
                {provide: DialogsService, useValue: dialogs},
                {provide: Router, useValue: router},
                {provide: AuthorizationService, useValue: {getUserId: () => 'test'}},
                {provide: PermissionsService, useValue: {
                    getUserById: () => of({username: 'u'}),
                    getComputedResourcePermissionsV2: () => of([{write: true}]),
                }},
                {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => routeId}}}},
            ],
        });
        snack = spyOn(TestBed.inject(MatSnackBar), 'open');
    });

    describe('header and version history', () => {
        it('shows the newest label in the header', () => {
            create(operatorWithVersions());
            expect(el().querySelector('.current-version')?.textContent?.trim()).toBe('v1.10.0');
        });

        it('shows the highest label that is not deprecated, as the repository does', () => {
            create(operatorWithDeprecatedHighest());
            expect(el().querySelector('.current-version')?.textContent?.trim()).toBe('v1.1.0');
        });

        it('says "no version" for an operator without one and shows nothing for a new operator', () => {
            create(operatorWithoutVersions());
            expect(el().querySelector('.current-version')?.textContent?.trim()).toBe('no version');
            create(null);
            expect(el().querySelector('.current-version')).toBeNull();
        });

        it('lists the versions newest first and marks the deprecated one', () => {
            create(operatorWithVersions());
            expect(rows().map(row => row.querySelector('.version-name')?.textContent?.trim().split(/\s+/)[0]))
                .toEqual(['v1.10.0', 'v1.2.0', 'v1.0.0']);
            expect(rows().map(row => row.querySelector('.badge') !== null)).toEqual([false, true, false]);
            expect(rows().map(row => row.querySelector('.toggle-deprecated')?.getAttribute('aria-label')))
                .toEqual(['Deprecate v1.10.0', 'Undeprecate v1.2.0', 'Deprecate v1.0.0']);
        });

        it('summarizes the ports of a version, zero for lists it does not carry', () => {
            create(operatorWithVersions());
            expect(rows().map(row => row.querySelector('.version-ports')?.textContent?.trim())).toEqual([
                '1 in, 1 out, 0 config', '1 in, 0 out, 0 config', '0 in, 0 out, 0 config',
            ]);
        });

        it('has no form to add a version, and the editors stay editable with versions', async () => {
            create(operatorWithVersions());
            await fixture.whenStable();
            fixture.detectChanges();
            expect(el().querySelector('.add-version')).toBeNull();
            expect(el().querySelector('.version-form')).toBeNull();
            const ports = fixture.debugElement.queryAll(By.directive(OperatorPortsComponent)).map(d => d.componentInstance);
            expect(ports.map(p => [p.readonly, p.disabled])).toEqual([[false, false], [false, false], [false, false]]);
            const image = el().querySelector('.image-input') as HTMLInputElement;
            expect(image.value).toBe('img:4');
            expect(image.readOnly).toBeFalse();
            expect(image.disabled).toBeFalse();
        });

        it('marks only the current version, which is not the highest one when that is deprecated', () => {
            create(operatorWithVersions());
            expect(rows().map(row => row.querySelector('.current-tag') !== null)).toEqual([true, false, false]);
            create(operatorWithDeprecatedHighest());
            expect(rows().map(row => row.querySelector('.current-tag') !== null)).toEqual([false, true, false]);
        });

        it('hints at the first save for an operator without versions', () => {
            create(operatorWithoutVersions());
            expect(el().querySelector('.no-versions')?.textContent).toContain('saves the current state as v1.0.0');
        });

        it('has no versions section for a new operator', () => {
            create(null);
            expect(el().querySelector('.versions')).toBeNull();
        });
    });

    describe('version rows', () => {
        const longImage = 'registry.example.org/some/very/long/path/to/an/image/with/a/very/long/name/that/will/not/fit/in/the/row:v1.2.3-build.20260101';
        const centre = (r: DOMRect) => r.top + r.height / 2;

        function withLongImage(): OperatorModel {
            const operator = operatorWithVersions();
            operator.versions![0].image = longImage;
            return operator;
        }

        it('lays every version out as one row of the same height, with or without badge and long image', async () => {
            create(withLongImage());
            await fixture.whenStable();
            fixture.detectChanges();
            const heights = rows().map(row => row.getBoundingClientRect().height);
            expect(heights.length).toBe(3);
            expect(heights.every(height => Math.abs(height - heights[0]) < 1)).withContext(heights.join()).toBeTrue();
            const cell = rows()[2].querySelector('.version-image-cell') as HTMLElement;
            expect(getComputedStyle(cell).textOverflow).toBe('ellipsis');
            expect(getComputedStyle(cell).whiteSpace).toBe('nowrap');
        });

        it('puts the action buttons at the same size, column and vertical centre in every row', async () => {
            create(withLongImage());
            await fixture.whenStable();
            fixture.detectChanges();
            for (const selector of ['.toggle-deprecated', '.delete-version']) {
                const buttons = rows().map(row => row.querySelector(selector)!.getBoundingClientRect());
                expect(buttons.every(r => Math.abs(r.width - buttons[0].width) < 1 && Math.abs(r.height - buttons[0].height) < 1))
                    .withContext(selector + ' size').toBeTrue();
                expect(buttons.every(r => Math.abs(r.left - buttons[0].left) < 1)).withContext(selector + ' column').toBeTrue();
            }
            rows().forEach((row, index) => {
                const rowBox = row.getBoundingClientRect();
                for (const selector of ['.expand-version', '.version-name', '.version-image-cell', '.toggle-deprecated', '.delete-version']) {
                    const box = row.querySelector(selector)!.getBoundingClientRect();
                    expect(Math.abs(centre(box) - centre(rowBox))).withContext(`${selector} of row ${index}`).toBeLessThan(1);
                }
            });
        });

        it('shows nothing of a version but its row until it is expanded', () => {
            create(operatorWithVersions());
            expect(el().querySelector('.version-details')).toBeNull();
            expect(rows().map(row => row.querySelector('.expand-version')?.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);
        });

        it('expands a version to its label, state, image, inputs, outputs and config values, read only', async () => {
            create(operatorWithVersions());
            click('.version-row:nth-child(1) .expand-version');
            await fixture.whenStable();
            fixture.detectChanges();

            const details = el().querySelector('.version-details') as HTMLElement;
            expect(details.textContent).toContain('v1.10.0');
            expect(details.textContent).toContain('current');
            expect(details.textContent).toContain('img:4');
            const blocks = Array.from(details.querySelectorAll('senergy-operator-ports')) as HTMLElement[];
            expect(blocks.map(block => block.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
                'Inputs (1)', 'Outputs (1)', 'Config values',
            ]);
            expect(Array.from(blocks[0].querySelectorAll('.readonly-row')).map(r =>
                [r.querySelector('.port-name')?.textContent, r.querySelector('.port-type')?.textContent])).toEqual([['a', text]]);
            expect(blocks[1].textContent).toContain('o');
            expect(blocks[2].textContent).toContain('No config values defined.');
            expect(details.querySelector('input, .add-button, .remove-button, mtx-select')).toBeNull();
            expect(rows()[0].querySelector('.expand-version')?.getAttribute('aria-expanded')).toBe('true');
            expect(component.dirty).toBeFalse();
        });

        it('shows the deprecated state of an older version and collapses again', async () => {
            create(operatorWithVersions());
            click('.version-row:nth-child(2) .expand-version');
            await fixture.whenStable();
            fixture.detectChanges();
            expect((el().querySelector('.version-details') as HTMLElement).textContent).toContain('deprecated');
            expect(el().querySelectorAll('.version-details').length).toBe(1);

            click('.version-row:nth-child(2) .expand-version');
            expect(el().querySelector('.version-details')).toBeNull();
        });

        it('keeps several versions open independently', async () => {
            create(operatorWithVersions());
            component.toggleExpanded('v1.0.0');
            component.toggleExpanded('v1.10.0');
            fixture.detectChanges();
            expect(el().querySelectorAll('.version-details').length).toBe(2);
            component.toggleExpanded('v1.0.0');
            fixture.detectChanges();
            expect(el().querySelectorAll('.version-details').length).toBe(1);
        });
    });

    describe('the proposed label', () => {
        const edit = (change: (op: OperatorModel) => void, operator = operatorWithoutVersions()) => {
            create(operator);
            change(component.operator);
            fixture.detectChanges();
        };

        it('raises the patch for a new image only, counted from v1.0.0 for an operator without versions', () => {
            edit(op => (op.image = 'img:2'));
            expect(component.proposedLabel).toBe('v1.0.1');
        });

        it('raises the minor for an added input, output or config value', () => {
            edit(op => {
                op.image = 'img:2';
                op.outputs!.push({name: 'p', type: 'float'});
            });
            expect(component.proposedLabel).toBe('v1.1.0');
        });

        it('raises the major for a removed, renamed or retyped port and a removed or retyped config value', () => {
            const label = (change: (op: OperatorModel) => void) => {
                edit(change);
                return component.proposedLabel;
            };
            expect(label(op => (op.inputs = []))).toBe('v2.0.0');
            expect(label(op => (op.outputs![0].name = 'renamed'))).toBe('v2.0.0');
            expect(label(op => (op.inputs![0].type = 'string'))).toBe('v2.0.0');
            expect(label(op => (op.config_values = []))).toBe('v2.0.0');
            expect(label(op => (op.config_values![0].type = 'int'))).toBe('v2.0.0');
        });

        it('counts a removal as major even when something was added too', () => {
            edit(op => {
                op.inputs = [{name: 'b', type: 'float'}];
            });
            expect(component.proposedLabel).toBe('v2.0.0');
        });

        it('starts from the highest label of a versioned operator, whatever the order', () => {
            edit(op => (op.image = 'img:5'), operatorWithVersions());
            expect(component.proposedLabel).toBe('v1.10.1');
            edit(op => (op.inputs!.push({name: 'b', type: text})), operatorWithVersions());
            expect(component.proposedLabel).toBe('v1.11.0');
            edit(op => (op.inputs = []), operatorWithVersions());
            expect(component.proposedLabel).toBe('v2.0.0');
        });

        it('is v1.0.0 for an operator whose stored state has no image', () => {
            const operator = operatorWithoutVersions();
            operator.image = undefined;
            edit(op => (op.image = 'img:2'), operator);
            expect(component.adopts).toBeFalse();
            expect(component.proposedLabel).toBe('v1.0.0');
        });

        it('is shown in the save bar and only for a change to image, ports or config', async () => {
            create(operatorWithoutVersions());
            component.operator.name = 'Renamed';
            fixture.detectChanges();
            expect(el().querySelector('.save-label')).toBeNull();

            component.operator.image = 'img:2';
            fixture.detectChanges();
            await fixture.whenStable();
            expect(el().querySelector('.saves-as')?.textContent).toContain('Saves as');
            expect((el().querySelector('.save-label') as HTMLInputElement).value).toBe('v1.0.1');
        });

        it('follows the change until the user types a label, which then wins', async () => {
            create(operatorWithoutVersions());
            component.operator.image = 'img:2';
            fixture.detectChanges();
            component.operator.inputs!.push({name: 'b', type: 'float'});
            expect(component.versionLabel).toBe('v1.1.0');
            component.versionLabel = 'v3.0.0';
            component.operator.inputs = [];
            expect(component.versionLabel).toBe('v3.0.0');
            component.discardChanges();
            expect(component.versionLabel).toBe('v1.0.1');
        });

        it('is validated against the label rule and the existing labels, v1.0.0 included when it is adopted', () => {
            edit(op => (op.image = 'img:2'));
            const error = (label: string) => {
                component.versionLabel = label;
                return component.versionLabelError();
            };
            expect(error('v2.0.0')).toBe('');
            expect(error('2.0.0')).toContain('v1.2.3');
            expect(error('v01.0.0')).toContain('v1.2.3');
            expect(error('v1.0.0-rc1')).toContain('v1.2.3');
            expect(error('v1.0.0')).toBe('Version v1.0.0 exists already');
            expect(component.valid).toBeFalse();

            edit(op => (op.image = 'img:5'), operatorWithVersions());
            expect(error('v1.2.0')).toBe('Version v1.2.0 exists already');
            expect(error('v1.11.0')).toBe('');
        });

        it('must be above the current version, the highest one that is not deprecated, but may be below a deprecated one', () => {
            edit(op => (op.image = 'img:5'), operatorWithDeprecatedHighest());
            const error = (label: string) => {
                component.versionLabel = label;
                return component.versionLabelError();
            };
            expect(component.proposedLabel).toBe('v2.0.1');
            expect(error('v2.0.1')).toBe('');
            expect(error('v1.5.0')).toBe('');
            expect(error('v1.0.5')).toBe('Must be above v1.1.0, the current version');
            expect(error('v1.1.0')).toBe('Version v1.1.0 exists already');
            expect(error('v2.0.0')).toBe('Version v2.0.0 exists already');
            expect(component.valid).toBeFalse();
        });

        it('must be above v1.0.0 when that is adopted, and above the highest when every version is deprecated', () => {
            edit(op => (op.image = 'img:2'));
            component.versionLabel = 'v0.9.0';
            expect(component.versionLabelError()).toBe('Must be above v1.0.0, the current version');

            const allDeprecated = operatorWithVersions();
            allDeprecated.versions!.forEach(version => (version.deprecated = true));
            edit(op => (op.image = 'img:5'), allDeprecated);
            component.versionLabel = 'v1.9.0';
            expect(component.versionLabelError()).toBe('Must be above v1.10.0, the current version');
        });

        it('disables save while the label is not valid', () => {
            edit(op => (op.image = 'img:2'));
            component.versionLabel = 'nonsense';
            fixture.detectChanges();
            expect((el().querySelector('.save-bar .save') as HTMLButtonElement).disabled).toBeTrue();
            component.saveOperator();
            expect(service.putOperatorVersion).not.toHaveBeenCalled();
        });
    });

    describe('a change that needs a new image', () => {
        it('blocks the save for changed ports or config with the old image and says why at the image', async () => {
            create(operatorWithoutVersions());
            component.operator.inputs!.push({name: 'b', type: 'float'});
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();

            const hint = 'Ports describe the image: a new version needs a new image';
            expect(component.imageProblem()).toBe(hint);
            expect(component.valid).toBeFalse();
            expect(el().querySelector('.image-problem')?.textContent).toContain(hint);
            expect((el().querySelector('.save-bar .save') as HTMLButtonElement).disabled).toBeTrue();
            component.saveOperator();
            expect(service.putOperatorVersion).not.toHaveBeenCalled();
            expect(service.saveOperator).not.toHaveBeenCalled();
        });

        it('is fine with a new image, and a changed image alone is enough', () => {
            create(operatorWithVersions());
            component.operator.inputs!.push({name: 'b', type: text});
            expect(component.valid).toBeFalse();
            component.operator.image = 'img:5';
            expect(component.imageProblem()).toBe('');
            expect(component.valid).toBeTrue();
        });

        it('asks for an image when it was emptied, and refuses one that another version has', () => {
            create(operatorWithVersions());
            component.operator.image = ' ';
            expect(component.imageProblem()).toBe('Image is required');
            component.operator.image = 'img:1';
            expect(component.imageProblem()).toContain('v1.0.0');
            expect(component.valid).toBeFalse();
        });

        it('does not count spaces around the image as a change', () => {
            create(operatorWithoutVersions());
            component.operator.image = ' img:1 ';
            expect(component.dirty).toBeFalse();
        });

        it('says nothing while only name or description changed', () => {
            create(operatorWithoutVersions());
            component.operator.name = 'Renamed';
            expect(component.imageProblem()).toBe('');
        });
    });

    describe('deprecating', () => {
        beforeEach(() => create(operatorWithVersions()));

        it('puts the version with its own data and the flag set; absent port lists become empty', () => {
            component.toggleDeprecated(component.operator.versions![0]);
            expect(service.putOperatorVersion).toHaveBeenCalledOnceWith('op1', 'v1.0.0', {
                image: 'img:1', inputs: [], outputs: [], config_values: [], deprecated: true,
            });
        });

        it('clears the flag of a deprecated version', () => {
            click('.version-row:nth-child(2) .toggle-deprecated');
            expect(service.putOperatorVersion).toHaveBeenCalledOnceWith('op1', 'v1.2.0', {
                image: 'img:3', inputs: [{name: 'a', type: text}], outputs: [], config_values: [], deprecated: false,
            });
            expect(snack.calls.mostRecent().args[0]).toBe('Version v1.2.0 undeprecated');
        });
    });

    describe('deleting a version', () => {
        beforeEach(() => create(operatorWithVersions()));
        const refuse = (status: number, error?: unknown) =>
            service.deleteOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status, error})));

        it('deletes after the confirmation and reloads', () => {
            service.getOperator.calls.reset();
            click('.version-row:nth-child(3) .delete-version');
            expect(service.deleteOperatorVersion).toHaveBeenCalledOnceWith('op1', 'v1.0.0');
            expect(service.getOperator).toHaveBeenCalledTimes(1);
            expect(snack.calls.mostRecent().args[0]).toBe('Version v1.0.0 deleted');
        });

        it('does nothing when the confirmation is declined', () => {
            dialogs.openDeleteDialog.and.returnValue({afterClosed: () => of(false)} as any);
            component.deleteVersion(component.operator.versions![0]);
            expect(service.deleteOperatorVersion).not.toHaveBeenCalled();
        });

        it('names what uses a version that is in use', () => {
            refuse(409, {error: 'in use', flows: 2, readable: [{id: 'f', name: 'Flow A'}], pipelines: 0});
            service.getOperator.calls.reset();
            component.deleteVersion(component.operator.versions![0]);
            expect(snack.calls.mostRecent().args[0]).toBe('Version v1.0.0 is in use by 2 flows (Flow A), it was not deleted');
            expect(service.getOperator).not.toHaveBeenCalled();
        });

        it('says that the only version cannot be deleted', () => {
            refuse(400, 'an operator keeps at least one version; delete the operator instead');
            component.deleteVersion(component.operator.versions![0]);
            expect(snack.calls.mostRecent().args[0]).toContain('keeps at least one version');
        });

        it('reports a down usage service', () => {
            refuse(502, 'usage service down');
            component.deleteVersion(component.operator.versions![0]);
            expect(snack.calls.mostRecent().args[0]).toContain('nothing was deleted');
        });

        it('allows the next action after a refusal', () => {
            refuse(502);
            component.deleteVersion(component.operator.versions![0]);
            expect(component.versionBusy).toBeFalse();
        });
    });

    describe('saving the operator', () => {
        it('sends no top-level image, ports or config for an operator with versions', () => {
            create(operatorWithVersions());
            component.operator.name = 'Renamed';
            fixture.detectChanges();
            click('.save-bar .save');

            const body = service.saveOperator.calls.mostRecent().args[0] as any;
            for (const key of ['image', 'inputs', 'outputs', 'config_values']) {
                expect(key in body).withContext(key).toBeFalse();
            }
            expect(body.name).toBe('Renamed');
            expect(component.operator.image).toBe('img:4');
        });

        it('sends the stored image, ports and config for a name change of an operator without versions, so they are not cleared', () => {
            create(operatorWithoutVersions());
            component.operator.name = 'Renamed';
            fixture.detectChanges();
            click('.save-bar .save');

            expect(service.putOperatorVersion).not.toHaveBeenCalled();
            const body = service.saveOperator.calls.mostRecent().args[0] as any;
            expect(body.name).toBe('Renamed');
            expect(body.image).toBe('img:1');
            expect(body.inputs).toEqual([{name: 'a', type: 'float'}]);
            expect(body.outputs).toEqual([{name: 'o', type: 'float'}]);
            expect(body.config_values).toEqual([{name: 'c', type: 'string'}]);
        });

        it('has no save bar until something changed and is clean again after saving', () => {
            create(operatorWithoutVersions());
            expect(el().querySelector('.save-bar')).toBeNull();
            component.operator.name = 'Other';
            fixture.detectChanges();
            expect(el().querySelector('.save-bar')).not.toBeNull();
            click('.save-bar .save');
            expect(component.dirty).toBeFalse();
            expect(el().querySelector('.save-bar')).toBeNull();
        });

        it('does not call an emptied description a change', () => {
            create(operatorWithoutVersions());
            component.operator.description = '';
            expect(component.dirty).toBeFalse();
        });

        it('disables save and sends nothing while the name is missing', () => {
            create(operatorWithoutVersions());
            component.operator.name = '  ';
            fixture.detectChanges();
            expect(component.valid).toBeFalse();
            expect((el().querySelector('.save-bar .save') as HTMLButtonElement).disabled).toBeTrue();
            component.saveOperator();
            expect(service.saveOperator).not.toHaveBeenCalled();
        });

        it('marks the empty name field and says that the name is required', async () => {
            create(operatorWithoutVersions());
            await fixture.whenStable();
            const field = () => fixture.debugElement.query(By.css('.general mat-form-field')).nativeElement as HTMLElement;
            expect(field().classList.contains('mat-form-field-invalid')).toBeFalse();

            component.operator.name = '';
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(field().classList.contains('mat-form-field-invalid')).toBeTrue();
            expect(field().textContent).toContain('Name is required');
        });

        it('disables save while a port name is used twice', () => {
            create(operatorWithoutVersions());
            component.operator.inputs!.push({name: 'a', type: 'float'});
            fixture.detectChanges();
            expect(component.valid).toBeFalse();
            expect((el().querySelector('.save-bar .save') as HTMLButtonElement).disabled).toBeTrue();
        });

        it('does not let a repeated name that is stored block the save of a versioned operator', () => {
            const operator = operatorWithVersions();
            operator.inputs = [{name: 'a', type: text}, {name: 'a', type: text}];
            create(operator);
            expect(component.valid).toBeTrue();
            component.operator.image = 'img:5';
            expect(component.valid).toBeTrue();
            component.operator.inputs!.push({name: 'a', type: text});
            expect(component.valid).toBeFalse();
        });

        it('stays dirty and not saving again when the repository refuses', () => {
            service.saveOperator.and.returnValue(of(null));
            create(operatorWithoutVersions());
            component.operator.name = 'Other';
            component.saveOperator();
            expect(component.dirty).toBeTrue();
            expect(component.isSaving).toBeFalse();
        });

        it('restores the loaded values on cancel', () => {
            create(operatorWithoutVersions());
            component.operator.name = 'Other';
            component.operator.inputs!.push({name: 'x', type: 'float'});
            component.discardChanges();
            expect(component.operator.name).toBe('Plain');
            expect(component.operator.inputs).toEqual([{name: 'a', type: 'float'}]);
            expect(component.dirty).toBeFalse();
        });

        it('keeps an unsaved name when a version write reloads the operator', () => {
            create(operatorWithVersions());
            component.operator.name = 'Renamed';
            component.toggleDeprecated(component.operator.versions![0]);
            expect(component.operator.name).toBe('Renamed');
            expect(component.dirty).toBeTrue();
        });
    });

    describe('saving as a version', () => {
        let order: string[];
        const putBodies = () => service.putOperatorVersion.calls.allArgs();

        function recordOrder() {
            order = [];
            service.putOperatorVersion.and.callFake((_id: string, label: string) => {
                order.push(`put ${label}`);
                return of({});
            });
            service.saveOperator.and.callFake(() => {
                order.push('post');
                return of({} as any);
            });
            service.getOperator.and.callFake(() => {
                order.push('get');
                return of(served === null ? null : JSON.parse(JSON.stringify(served)));
            });
        }

        it('writes the stored state as v1.0.0 first for an operator without versions, then the change, then reloads', () => {
            create(operatorWithoutVersions());
            recordOrder();
            component.operator.image = 'img:2';
            component.operator.outputs!.push({name: 'p', type: 'float'});
            fixture.detectChanges();
            served = {...operatorWithoutVersions(), image: 'img:2', versions: [{version: 'v1.0.0', image: 'img:1'}, {version: 'v1.1.0', image: 'img:2'}]};

            click('.save-bar .save');

            expect(order).toEqual(['put v1.0.0', 'put v1.1.0', 'get']);
            expect(putBodies()[0]).toEqual(['op2', 'v1.0.0', {
                image: 'img:1',
                inputs: [{name: 'a', type: 'float'}],
                outputs: [{name: 'o', type: 'float'}],
                config_values: [{name: 'c', type: 'string'}],
                deprecated: false,
            }]);
            expect(putBodies()[1]).toEqual(['op2', 'v1.1.0', {
                image: 'img:2',
                inputs: [{name: 'a', type: 'float'}],
                outputs: [{name: 'o', type: 'float'}, {name: 'p', type: 'float'}],
                config_values: [{name: 'c', type: 'string'}],
                deprecated: false,
            }]);
            expect(snack.calls.mostRecent().args[0]).toBe('Operator saved as v1.1.0');
            expect(component.dirty).toBeFalse();
            expect(component.currentVersion).toBe('v1.1.0');
            expect(el().querySelector('.save-bar')).toBeNull();
        });

        it('skips the first version for an operator whose stored state has no image', () => {
            const operator = operatorWithoutVersions();
            operator.image = undefined;
            create(operator);
            component.operator.image = 'img:2';
            fixture.detectChanges();
            click('.save-bar .save');
            expect(putBodies().map(args => args[1])).toEqual(['v1.0.0']);
            expect((putBodies()[0][2] as any).image).toBe('img:2');
        });

        it('writes one version for an operator with versions and the label the user typed', () => {
            create(operatorWithVersions());
            recordOrder();
            component.operator.image = 'img:5';
            component.versionLabel = 'v2.0.0';
            fixture.detectChanges();
            click('.save-bar .save');

            expect(order).toEqual(['put v2.0.0', 'get']);
            expect(putBodies()).toEqual([['op1', 'v2.0.0', {
                image: 'img:5', inputs: [{name: 'a', type: text}], outputs: [], config_values: [], deprecated: false,
            }]]);
        });

        it('posts name and the like after the version, without image, ports and config', () => {
            create(operatorWithoutVersions());
            recordOrder();
            component.operator.name = 'Renamed';
            component.operator.image = 'img:2';
            fixture.detectChanges();
            click('.save-bar .save');

            expect(order).toEqual(['put v1.0.0', 'put v1.0.1', 'post', 'get']);
            const body = service.saveOperator.calls.mostRecent().args[0] as any;
            expect(body.name).toBe('Renamed');
            for (const key of ['image', 'inputs', 'outputs', 'config_values']) {
                expect(key in body).withContext(key).toBeFalse();
            }
        });

        it('writes no version and posts only for a change of name, description, type or cost', () => {
            create(operatorWithVersions());
            recordOrder();
            component.operator.cost = 3;
            fixture.detectChanges();
            click('.save-bar .save');
            expect(order).toEqual(['post', 'get']);
        });

        it('stays busy for the whole chain, including the reload', async () => {
            create(operatorWithoutVersions());
            const firstPut = new Subject<unknown>();
            const reload = new Subject<OperatorModel | null>();
            service.putOperatorVersion.and.returnValues(firstPut, of({}));
            component.operator.image = 'img:2';
            fixture.detectChanges();
            service.getOperator.and.returnValue(reload);

            component.saveOperator();
            expect(component.isSaving).toBeTrue();
            expect(service.putOperatorVersion).toHaveBeenCalledTimes(1);
            fixture.detectChanges();
            await fixture.whenStable();
            expect((el().querySelector('.save-bar .save') as HTMLButtonElement).disabled).toBeTrue();
            expect((el().querySelector('.save-label') as HTMLInputElement).disabled).toBeTrue();
            component.saveOperator();
            expect(service.putOperatorVersion).toHaveBeenCalledTimes(1);

            firstPut.next({});
            firstPut.complete();
            expect(service.putOperatorVersion).toHaveBeenCalledTimes(2);
            expect(component.isSaving).toBeTrue();
            reload.next({...operatorWithoutVersions(), image: 'img:2'});
            reload.complete();
            expect(component.isSaving).toBeFalse();
        });

        describe('when a step fails', () => {
            it('keeps the edits and does not reload when the new version is refused, and does not repeat the first version on retry', () => {
                create(operatorWithoutVersions());
                service.putOperatorVersion.and.returnValues(
                    of({}),
                    throwError(() => new HttpErrorResponse({status: 400, error: 'image belongs to another version\n'})),
                    of({}), of({}));
                component.operator.image = 'img:2';
                component.operator.name = 'Renamed';
                service.getOperator.calls.reset();

                component.saveOperator();

                expect(snack.calls.mostRecent().args[0]).toBe('image belongs to another version');
                expect(component.operator.image).toBe('img:2');
                expect(component.operator.name).toBe('Renamed');
                expect(component.isSaving).toBeFalse();
                expect(component.dirty).toBeTrue();
                expect(service.saveOperator).not.toHaveBeenCalled();
                expect(service.getOperator).not.toHaveBeenCalled();
                expect(component.operator.versions!.map(v => v.version)).toEqual(['v1.0.0']);
                expect(component.proposedLabel).toBe('v1.0.1');

                component.saveOperator();
                expect(putBodies().map(args => args[1])).toEqual(['v1.0.0', 'v1.0.1', 'v1.0.1']);
                expect(service.saveOperator).toHaveBeenCalledTimes(1);
            });

            it('sends nothing more when the first version is refused', () => {
                create(operatorWithoutVersions());
                service.putOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status: 403})));
                component.operator.image = 'img:2';
                component.saveOperator();
                expect(putBodies().length).toBe(1);
                expect(snack.calls.mostRecent().args[0]).toBe('You may not change versions of this operator');
                expect(component.operator.image).toBe('img:2');
                expect(component.isSaving).toBeFalse();
            });

            it('says what went through when name and the like are refused after the version', () => {
                create(operatorWithVersions());
                service.saveOperator.and.returnValue(of(null));
                component.operator.name = 'Renamed';
                component.operator.image = 'img:5';
                service.getOperator.calls.reset();

                component.saveOperator();

                expect(snack.calls.mostRecent().args[0]).toBe('Version v1.10.1 saved, the other changes were not saved');
                expect(service.getOperator).not.toHaveBeenCalled();
                expect(component.topLevelDirty).toBeFalse();
                expect(component.generalDirty).toBeTrue();
                expect(component.operator.versions!.map(v => v.version)).toContain('v1.10.1');
                expect(component.isSaving).toBeFalse();
            });

            it('reports a concurrent change with the text of the repository', () => {
                create(operatorWithVersions());
                service.putOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status: 409, error: 'operator was changed, retry'})));
                component.operator.image = 'img:5';
                component.saveOperator();
                expect(snack.calls.mostRecent().args[0]).toBe('operator was changed, retry');
            });
        });

        describe('a new operator', () => {
            const fill = () => {
                create(null);
                component.operator.name = 'Fresh';
                component.operator.image = 'img:1';
                component.operator.inputs = [{name: 'a', type: 'float'}];
                fixture.detectChanges();
            };
            const created = (id: string | undefined) => service.saveOperator.and.returnValue(
                of({status: 201, body: id === undefined ? null : {_id: id}} as any));

            it('is created, written as v1.0.0 with its image and ports, read again and opened under its id', () => {
                fill();
                expect(el().querySelector('.save-label')).toBeNull();
                created('new1');
                const steps: string[] = [];
                service.saveOperator.and.callFake(() => {
                    steps.push('create');
                    return of({status: 201, body: {_id: 'new1'}} as any);
                });
                service.putOperatorVersion.and.callFake((_id: string, label: string) => {
                    steps.push(`put ${label}`);
                    return of({});
                });
                service.getOperator.and.callFake(() => {
                    steps.push('get');
                    return of({...operatorWithoutVersions(), _id: 'new1', versions: [{version: 'v1.0.0', image: 'img:1'}]});
                });

                component.saveOperator();

                expect(steps).toEqual(['create', 'put v1.0.0', 'get']);
                expect((service.saveOperator.calls.mostRecent().args[0] as any).image).toBe('img:1');
                expect(service.putOperatorVersion).toHaveBeenCalledOnceWith('new1', 'v1.0.0', {
                    image: 'img:1', inputs: [{name: 'a', type: 'float'}], outputs: [], config_values: [], deprecated: false,
                });
                expect(service.getOperator).toHaveBeenCalledWith('new1');
                expect(component.operator._id).toBe('new1');
                expect(snack.calls.mostRecent().args[0]).toBe('Operator saved as v1.0.0');
                expect(router.navigate).toHaveBeenCalledOnceWith(['/data/operator-repo/op', 'new1'], {replaceUrl: true});
                expect(component.isSaving).toBeFalse();
            });

            it('updates instead of creating again when it is saved a second time before the page changes', () => {
                fill();
                created('new1');
                service.putOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
                component.saveOperator();
                expect(component.operator._id).toBe('new1');

                component.operator.name = 'Renamed';
                service.saveOperator.calls.reset();
                component.saveOperator();
                expect(service.saveOperator).toHaveBeenCalledTimes(1);
                const [body] = service.saveOperator.calls.mostRecent().args as [any];
                expect(body._id).toBe('new1');
                expect(body.name).toBe('Renamed');
            });

            it('says the operator exists but has no version when writing v1.0.0 fails, and does not open it', () => {
                fill();
                created('new1');
                service.putOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status: 400, error: 'bad image\n'})));
                component.saveOperator();
                expect(snack.calls.mostRecent().args[0]).toBe('Operator created, v1.0.0 not written. bad image');
                expect(router.navigate).not.toHaveBeenCalled();
                expect(component.isSaving).toBeFalse();
            });

            it('writes no version for an operator without an image but still opens it', () => {
                fill();
                component.operator.image = '';
                created('new1');
                component.saveOperator();
                expect(service.putOperatorVersion).not.toHaveBeenCalled();
                expect(snack.calls.mostRecent().args[0]).toBe('Operator saved');
                expect(router.navigate).toHaveBeenCalledOnceWith(['/data/operator-repo/op', 'new1'], {replaceUrl: true});
            });

            it('keeps today\'s behaviour when the repository answers without an id and says so', () => {
                fill();
                created(undefined);
                service.getOperator.calls.reset();
                component.saveOperator();

                expect(service.saveOperator).toHaveBeenCalledTimes(1);
                expect(service.putOperatorVersion).not.toHaveBeenCalled();
                expect(service.getOperator).not.toHaveBeenCalled();
                expect(router.navigate).not.toHaveBeenCalled();
                expect(component.operator._id).toBeUndefined();
                expect(snack.calls.mostRecent().args[0]).toBe('Created. Open the operator again to manage versions.');
                expect(component.dirty).toBeFalse();
            });

            it('does not open or version anything when the repository refuses', () => {
                fill();
                service.saveOperator.and.returnValue(of(null));
                component.saveOperator();
                expect(service.putOperatorVersion).not.toHaveBeenCalled();
                expect(router.navigate).not.toHaveBeenCalled();
                expect(component.dirty).toBeTrue();
            });
        });
    });

    describe('edits and writes that must not overlap', () => {
        const disabled = (selector: string) => (el().querySelector(selector) as HTMLButtonElement).disabled;
        const portsComponents = () => fixture.debugElement.queryAll(By.directive(OperatorPortsComponent)).map(d => d.componentInstance);

        it('does not deprecate or delete a version over unsaved image or port edits and says why', () => {
            create(operatorWithVersions());
            component.operator.image = 'img:5';
            fixture.detectChanges();

            expect(disabled('.toggle-deprecated')).toBeTrue();
            expect(disabled('.delete-version')).toBeTrue();
            expect(el().querySelector('.save-first')?.textContent).toContain('Save or discard');
            component.toggleDeprecated(component.operator.versions![0]);
            component.deleteVersion(component.operator.versions![0]);
            expect(service.putOperatorVersion).not.toHaveBeenCalled();
            expect(service.deleteOperatorVersion).not.toHaveBeenCalled();

            component.discardChanges();
            fixture.detectChanges();
            expect(disabled('.toggle-deprecated')).toBeFalse();
            expect(el().querySelector('.save-first')).toBeNull();
        });

        it('does not count name or description edits as a reason to hold back a version action', () => {
            create(operatorWithVersions());
            component.operator.name = 'Other';
            component.toggleDeprecated(component.operator.versions![0]);
            expect(service.putOperatorVersion).toHaveBeenCalledTimes(1);
        });

        it('does not save while a version write is pending', () => {
            create(operatorWithVersions());
            const put = new Subject<unknown>();
            service.putOperatorVersion.and.returnValue(put);
            component.operator.name = 'Renamed';
            component.toggleDeprecated(component.operator.versions![0]);
            fixture.detectChanges();

            expect(disabled('.save-bar .save')).toBeTrue();
            component.saveOperator();
            expect(service.saveOperator).not.toHaveBeenCalled();
        });

        it('does not save while the reload after a version write is pending', () => {
            create(operatorWithVersions());
            const reload = new Subject<OperatorModel | null>();
            service.getOperator.and.returnValue(reload);
            component.operator.name = 'Renamed';
            component.toggleDeprecated(component.operator.versions![0]);
            fixture.detectChanges();

            expect(component.versionBusy).toBeTrue();
            expect(disabled('.save-bar .save')).toBeTrue();
            reload.next(operatorWithVersions());
            reload.complete();
            fixture.detectChanges();
            expect(disabled('.save-bar .save')).toBeFalse();
        });

        it('is read only while a version write and its reload are pending, so the reload overwrites no edit', async () => {
            create(operatorWithVersions());
            const reload = new Subject<OperatorModel | null>();
            service.getOperator.and.returnValue(reload);
            component.toggleDeprecated(component.operator.versions![0]);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.versionBusy).toBeTrue();
            expect(component.readOnly).toBeTrue();
            expect(portsComponents().map(p => p.disabled)).toEqual([true, true, true]);
            expect((el().querySelector('.general input') as HTMLInputElement).disabled).toBeTrue();
            expect((el().querySelector('.image-input') as HTMLInputElement).disabled).toBeTrue();

            reload.next(operatorWithVersions());
            reload.complete();
            fixture.detectChanges();
            await fixture.whenStable();
            expect(component.readOnly).toBeFalse();
            expect(portsComponents().map(p => p.disabled)).toEqual([false, false, false]);
        });

        it('does not start a second write while one is pending', () => {
            create(operatorWithVersions());
            service.putOperatorVersion.and.returnValue(new Subject<unknown>());
            component.toggleDeprecated(component.operator.versions![0]);
            component.toggleDeprecated(component.operator.versions![1]);
            component.deleteVersion(component.operator.versions![2]);
            expect(service.putOperatorVersion).toHaveBeenCalledTimes(1);
            expect(service.deleteOperatorVersion).not.toHaveBeenCalled();
        });

        it('releases the busy flag when the write is refused', () => {
            create(operatorWithVersions());
            service.putOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
            component.toggleDeprecated(component.operator.versions![0]);
            expect(component.versionBusy).toBeFalse();
        });

        it('does not deprecate or delete a version while the operator is being saved', () => {
            create(operatorWithVersions());
            service.saveOperator.and.returnValue(new Subject<any>());
            component.operator.name = 'Renamed';
            component.saveOperator();
            fixture.detectChanges();

            expect(disabled('.toggle-deprecated')).toBeTrue();
            expect(disabled('.delete-version')).toBeTrue();
            component.toggleDeprecated(component.operator.versions![0]);
            component.deleteVersion(component.operator.versions![0]);
            expect(service.putOperatorVersion).not.toHaveBeenCalled();
            expect(service.deleteOperatorVersion).not.toHaveBeenCalled();
        });

        it('makes the form read only while saving', async () => {
            create(operatorWithoutVersions());
            service.saveOperator.and.returnValue(new Subject<any>());
            component.operator.name = 'Renamed';
            component.saveOperator();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.readOnly).toBeTrue();
            expect(portsComponents().map(p => p.disabled)).toEqual([true, true, true]);
            expect((el().querySelector('.general input') as HTMLInputElement).disabled).toBeTrue();
        });

        it('counts what was sent as saved, not what the form shows when the answer arrives', () => {
            create(operatorWithoutVersions());
            const answer = new Subject<any>();
            service.saveOperator.and.returnValue(answer);
            component.operator.name = 'Sent';
            component.saveOperator();
            component.operator.name = 'Edited in between';

            answer.next({});
            answer.complete();

            expect(component.saved.name).toBe('Sent');
            expect(component.dirty).toBeTrue();
            expect((service.saveOperator.calls.mostRecent().args[0] as any).name).toBe('Sent');
        });
    });

    describe('rows that are not allowed', () => {
        const io = (name: string | undefined, type: string | undefined) => ({name, type}) as any;

        it('blocks the operator save for a row without a name or a type and sends nothing', () => {
            create(operatorWithoutVersions());
            component.operator.image = 'img:2';
            component.operator.inputs!.push({} as any);
            fixture.detectChanges();
            expect(component.valid).toBeFalse();
            component.saveOperator();
            expect(service.saveOperator).not.toHaveBeenCalled();

            component.operator.inputs![1] = io('b', undefined);
            expect(component.valid).toBeFalse();
            component.operator.inputs![1] = io('  ', 'float');
            expect(component.valid).toBeFalse();
            component.operator.inputs![1] = io('b', 'float');
            expect(component.valid).toBeTrue();
        });

        it('shows what is missing on the row', async () => {
            create(operatorWithoutVersions());
            component.operator.outputs!.push({} as any);
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            const content = el().textContent;
            expect(content).toContain('Name required');
            expect(content).toContain('Type required');
        });

        it('blocks the save of a versioned operator for an incomplete row it added', () => {
            create(operatorWithVersions());
            component.operator.image = 'img:5';
            component.operator.config_values = [io(undefined, 'float')];
            expect(component.valid).toBeFalse();
            component.operator.config_values = [io('c', undefined)];
            expect(component.valid).toBeFalse();
            component.saveOperator();
            expect(service.putOperatorVersion).not.toHaveBeenCalled();
        });

        it('does not block the save of an operator that stored a duplicate name already', () => {
            const operator = operatorWithoutVersions();
            operator.inputs = [io('a', 'float'), io('a', 'float')];
            create(operator);
            component.operator.name = 'Renamed';
            expect(component.valid).toBeTrue();
            component.saveOperator();
            expect(service.saveOperator).toHaveBeenCalledTimes(1);
        });

        it('shows a stored duplicate as a warning on its rows, not as an error', async () => {
            const operator = operatorWithoutVersions();
            operator.inputs = [io('a', 'float'), io('a', 'float')];
            create(operator);
            await fixture.whenStable();
            fixture.detectChanges();
            expect(el().querySelectorAll('.name-warning').length).toBe(2);
            expect(el().querySelector('mat-form-field.mat-form-field-invalid')).toBeNull();
        });

        it('does not block the save for a stored row without a type, but for an edited or added one', () => {
            const operator = operatorWithoutVersions();
            operator.config_values = [io('c', undefined)];
            create(operator);
            component.operator.name = 'Renamed';
            expect(component.valid).toBeTrue();
            component.saveOperator();
            expect(service.saveOperator).toHaveBeenCalledTimes(1);

            component.operator.image = 'img:2';
            expect(component.valid).toBeTrue();
            component.operator.config_values![0].name = 'd';
            expect(component.valid).toBeFalse();
            component.operator.config_values![0].name = 'c';
            component.operator.config_values!.push(io('e', undefined));
            expect(component.valid).toBeFalse();
        });

        it('blocks the save when the edit adds another duplicate or a new one', () => {
            const operator = operatorWithoutVersions();
            operator.inputs = [io('a', 'float'), io('a', 'float')];
            create(operator);
            component.operator.image = 'img:2';
            expect(component.valid).toBeTrue();
            component.operator.inputs!.push(io('a', 'float'));
            expect(component.valid).toBeFalse();
            component.operator.inputs!.pop();
            component.operator.outputs!.push(io('o', 'float'));
            expect(component.valid).toBeFalse();
        });

        it('compares names exactly as the repository does', () => {
            create(operatorWithoutVersions());
            component.operator.image = 'img:2';
            component.operator.inputs!.push(io('a ', 'float'), io('A', 'float'));
            expect(component.valid).toBeTrue();
        });
    });
});
