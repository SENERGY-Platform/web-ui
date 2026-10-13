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
import {ActivatedRoute} from '@angular/router';
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

    describe('version list', () => {
        it('lists the versions newest first and marks the deprecated one', () => {
            create(operatorWithVersions());
            expect(rows().map(row => row.querySelector('.version-name')?.textContent?.trim().split(/\s+/)[0]))
                .toEqual(['v1.10.0', 'v1.2.0', 'v1.0.0']);
            expect(rows().map(row => row.querySelector('.badge') !== null)).toEqual([false, true, false]);
            expect(rows().map(row => row.querySelector('.toggle-deprecated')?.textContent?.trim()))
                .toEqual(['Deprecate', 'Undeprecate', 'Deprecate']);
        });

        it('counts the ports of a version that has none listed as zero', () => {
            create(operatorWithVersions());
            const cells = Array.from(rows()[2].querySelectorAll('td')).map(cell => cell.textContent?.trim());
            expect(cells.slice(2, 5)).toEqual(['0', '0', '0']);
        });

        it('hints at adding one for an operator without versions and keeps its editors', () => {
            create(operatorWithoutVersions());
            expect(el().querySelector('.no-versions')?.textContent).toContain('No versions yet. Add one to let flows pin it.');
            const ports = fixture.debugElement.queryAll(By.directive(OperatorPortsComponent)).map(d => d.componentInstance);
            expect(ports.map(p => p.readonly)).toEqual([false, false, false]);
        });

        it('makes image, ports and config read only with a hint once there are versions', async () => {
            create(operatorWithVersions());
            await fixture.whenStable();
            fixture.detectChanges();
            const ports = fixture.debugElement.queryAll(By.directive(OperatorPortsComponent)).map(d => d.componentInstance);
            expect(ports.map(p => p.readonly)).toEqual([true, true, true]);
            expect(ports[0].hint).toContain('Changed through versions');
            expect((el().querySelector('.section input[readonly]') as HTMLInputElement | null)?.value).toBe('img:4');
        });

        it('has no versions section for a new operator', () => {
            create(null);
            expect(el().querySelector('.versions')).toBeNull();
        });
    });

    describe('adding a version', () => {
        beforeEach(() => create(operatorWithVersions()));

        it('proposes the next patch label and prefills from the top level without sharing its rows', () => {
            component.startAddVersion();
            expect(component.newVersion.label).toBe('v1.10.1');
            expect(component.newVersion.image).toBe('img:4');
            expect(component.newVersion.inputs).toEqual([{name: 'a', type: text}]);
            expect(component.newVersion.inputs[0]).not.toBe(component.operator.inputs![0]);
            expect(component.newVersion.outputs).toEqual([]);
        });

        it('proposes v1.0.0 for an operator without versions', () => {
            create(operatorWithoutVersions());
            component.startAddVersion();
            expect(component.newVersion.label).toBe('v1.0.0');
        });

        it('validates the label against the rule and the existing versions', () => {
            component.startAddVersion();
            component.newVersion.image = 'img:5';
            const error = (label: string) => {
                component.newVersion.label = label;
                return component.versionLabelError();
            };
            expect(error('v2.0.0')).toBe('');
            expect(error('2.0.0')).toContain('v1.2.3');
            expect(error('v01.0.0')).toContain('v1.2.3');
            expect(error('v1.0.0-rc1')).toContain('v1.2.3');
            expect(error('v1.2.0')).toBe('Version v1.2.0 exists already');
            expect(component.newVersionValid).toBeFalse();
            component.newVersion.label = 'v2.0.0';
            expect(component.newVersionValid).toBeTrue();
        });

        it('refuses an image another version has and an empty one', () => {
            component.startAddVersion();
            expect(component.versionImageError()).toContain('v1.10.0');
            component.newVersion.image = ' ';
            expect(component.versionImageError()).toBe('Image is required');
            component.newVersion.image = 'img:5';
            expect(component.versionImageError()).toBe('');
        });

        it('refuses duplicate port names', () => {
            component.startAddVersion();
            component.newVersion.label = 'v2.0.0';
            component.newVersion.image = 'img:5';
            component.newVersion.outputs = [{name: 'x', type: text}, {name: 'x', type: text}];
            expect(component.newVersionValid).toBeFalse();
        });

        it('puts the version with its data and reloads the operator', () => {
            click('.add-version');
            component.newVersion.label = 'v2.0.0';
            component.newVersion.image = 'img:5';
            component.newVersion.outputs = [{name: 'o', type: 'float'}];
            fixture.detectChanges();
            service.getOperator.calls.reset();
            served = {...operatorWithVersions(), image: 'img:5',
                versions: [...operatorWithVersions().versions!, {version: 'v2.0.0', image: 'img:5'}]};

            click('.save-version');

            expect(service.putOperatorVersion).toHaveBeenCalledOnceWith('op1', 'v2.0.0', {
                image: 'img:5',
                inputs: [{name: 'a', type: text}],
                outputs: [{name: 'o', type: 'float'}],
                config_values: [],
                deprecated: false,
            });
            expect(service.getOperator).toHaveBeenCalledOnceWith('op1');
            expect(component.addingVersion).toBeFalse();
            expect(rows()[0].querySelector('.version-name')?.textContent).toContain('v2.0.0');
            expect(component.operator.image).toBe('img:5');
        });

        it('does not send an invalid version', () => {
            click('.add-version');
            component.newVersion.label = 'nonsense';
            fixture.detectChanges();
            expect((el().querySelector('.save-version') as HTMLButtonElement).disabled).toBeTrue();
            component.saveVersion();
            expect(service.putOperatorVersion).not.toHaveBeenCalled();
        });

        it('shows the refusal of the repository and keeps the form open', () => {
            service.putOperatorVersion.and.returnValue(throwError(() => new HttpErrorResponse({status: 400, error: 'image belongs to another version\n'})));
            component.startAddVersion();
            component.newVersion.label = 'v2.0.0';
            component.newVersion.image = 'img:5';
            service.getOperator.calls.reset();
            component.saveVersion();
            expect(snack.calls.mostRecent().args[0]).toBe('image belongs to another version');
            expect(component.addingVersion).toBeTrue();
            expect(service.getOperator).not.toHaveBeenCalled();
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

        it('sends the whole operator as before when it has no versions', () => {
            create(operatorWithoutVersions());
            component.operator.image = 'img:2';
            fixture.detectChanges();
            click('.save-bar .save');

            const body = service.saveOperator.calls.mostRecent().args[0] as any;
            expect(body.image).toBe('img:2');
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

        it('does not let a repeated name in a read only list block the save', () => {
            const operator = operatorWithVersions();
            operator.inputs = [{name: 'a', type: text}, {name: 'a', type: text}];
            create(operator);
            expect(component.valid).toBeTrue();
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

    describe('edits and writes that must not overlap', () => {
        const disabled = (selector: string) => (el().querySelector(selector) as HTMLButtonElement).disabled;
        const portsComponents = () => fixture.debugElement.queryAll(By.directive(OperatorPortsComponent)).map(d => d.componentInstance);

        it('does not open the add form over unsaved image or port edits and says why', () => {
            create(operatorWithoutVersions());
            component.operator.image = 'img:2';
            fixture.detectChanges();

            expect(component.topLevelDirty).toBeTrue();
            expect(disabled('.add-version')).toBeTrue();
            expect(el().querySelector('.save-first')?.textContent).toContain('Save or discard');
            component.startAddVersion();
            expect(component.addingVersion).toBeFalse();

            component.discardChanges();
            fixture.detectChanges();
            expect(disabled('.add-version')).toBeFalse();
            expect(el().querySelector('.save-first')).toBeNull();
            component.startAddVersion();
            expect(component.addingVersion).toBeTrue();
        });

        it('allows the add form after the edits were saved', () => {
            create(operatorWithoutVersions());
            component.operator.inputs!.push({name: 'b', type: 'float'});
            component.saveOperator();
            expect(component.topLevelDirty).toBeFalse();
            component.startAddVersion();
            expect(component.addingVersion).toBeTrue();
        });

        it('does not count name or description edits as a reason to hold back the add form', () => {
            create(operatorWithoutVersions());
            component.operator.name = 'Other';
            component.startAddVersion();
            expect(component.addingVersion).toBeTrue();
        });

        it('locks image, ports and config while the add form is open', () => {
            create(operatorWithoutVersions());
            expect(portsComponents().map(p => p.disabled)).toEqual([false, false, false]);
            component.startAddVersion();
            fixture.detectChanges();
            expect(portsComponents().slice(0, 3).map(p => p.disabled)).toEqual([true, true, true]);
            expect(portsComponents()[0].hint).toContain('Locked while a version is being added');
            expect(component.topLevelLocked).toBeTrue();
            component.cancelAddVersion();
            expect(component.topLevelLocked).toBeFalse();
        });

        it('keeps the add form open and the top level locked until the reload is in', () => {
            create(operatorWithoutVersions());
            const reload = new Subject<OperatorModel | null>();
            service.getOperator.and.returnValue(reload);
            component.startAddVersion();
            component.saveVersion();

            expect(service.putOperatorVersion).toHaveBeenCalledTimes(1);
            expect(component.addingVersion).toBeTrue();
            expect(component.topLevelLocked).toBeTrue();
            reload.next({...operatorWithoutVersions(), versions: [{version: 'v1.0.0', image: 'img:1'}]});
            reload.complete();
            expect(component.addingVersion).toBeFalse();
            expect(component.versionBusy).toBeFalse();
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

        it('does not add, deprecate or delete a version while the operator is being saved', () => {
            create(operatorWithVersions());
            service.saveOperator.and.returnValue(new Subject<any>());
            component.operator.name = 'Renamed';
            component.saveOperator();
            fixture.detectChanges();

            expect(disabled('.add-version')).toBeTrue();
            expect(disabled('.toggle-deprecated')).toBeTrue();
            expect(disabled('.delete-version')).toBeTrue();
            component.toggleDeprecated(component.operator.versions![0]);
            component.deleteVersion(component.operator.versions![0]);
            component.startAddVersion();
            component.newVersion = {label: 'v9.0.0', image: 'img:9', inputs: [], outputs: [], config_values: []};
            component.saveVersion();
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

        it('blocks the version form for an incomplete row', () => {
            create(operatorWithVersions());
            component.startAddVersion();
            component.newVersion.label = 'v2.0.0';
            component.newVersion.image = 'img:5';
            expect(component.newVersionValid).toBeTrue();
            component.newVersion.config_values = [io(undefined, 'float')];
            expect(component.newVersionValid).toBeFalse();
            component.newVersion.config_values = [io('c', undefined)];
            expect(component.newVersionValid).toBeFalse();
            component.saveVersion();
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
            component.operator.inputs!.push(io('a', 'float'));
            expect(component.valid).toBeFalse();
            component.operator.inputs!.pop();
            component.operator.outputs!.push(io('o', 'float'));
            expect(component.valid).toBeFalse();
        });

        it('compares names exactly as the repository does', () => {
            create(operatorWithoutVersions());
            component.operator.inputs!.push(io('a ', 'float'), io('A', 'float'));
            expect(component.valid).toBeTrue();
        });
    });
});
