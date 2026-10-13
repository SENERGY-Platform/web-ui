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
 *  limitations under the License.
 */

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatSelectModule} from '@angular/material/select';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {OperatorVersionDialogComponent, OperatorVersionDialogData} from './operator-version-dialog.component';
import {NEWEST_VERSION} from '../../operator-repo/shared/operator-version';

const text = 'https://schema.org/Text';

function dialogData(operatorVersion: string | undefined): OperatorVersionDialogData {
    return {
        node: {
            operatorId: 'op',
            name: 'my operator',
            image: 'img:v2.0.0',
            operatorVersion,
            inPorts: ['a', 'b'],
            outPorts: ['o', 'p'],
            config: [{name: 'c', type: text}],
            links: [
                {id: 'in-b', direction: 'in', port: 'b', peerName: 'source node'},
                {id: 'out-p', direction: 'out', port: 'p', peerName: 'target node'},
                {id: 'in-a', direction: 'in', port: 'a', peerName: 'source node'},
            ],
        },
        operator: {
            _id: 'op',
            name: 'my operator',
            image: 'img:v2.0.0',
            description: undefined,
            deploymentType: 'cloud',
            userId: undefined,
            inputs: [{name: 'a', type: text}, {name: 'b', type: text}],
            outputs: [{name: 'o', type: text}, {name: 'p', type: text}],
            config_values: [{name: 'c', type: text}],
            versions: [
                {version: 'v1.0.0', image: 'img:v1.0.0', inputs: [{name: 'a', type: text}], outputs: [{name: 'o', type: text}]},
                {version: 'v1.5.0', image: 'img:v1.5.0', deprecated: true, inputs: [{name: 'a', type: text}, {name: 'b', type: text}],
                    outputs: [{name: 'o', type: text}], config_values: [{name: 'd', type: text}]},
                {version: 'v2.0.0', image: 'img:v2.0.0', inputs: [{name: 'a', type: text}, {name: 'b', type: text}],
                    outputs: [{name: 'o', type: text}, {name: 'p', type: text}], config_values: [{name: 'c', type: text}]},
            ],
        },
    };
}

describe('OperatorVersionDialogComponent', () => {
    let fixture: ComponentFixture<OperatorVersionDialogComponent>;
    let component: OperatorVersionDialogComponent;
    let close: jasmine.Spy;

    function create(data: OperatorVersionDialogData) {
        close = jasmine.createSpy('close');
        TestBed.configureTestingModule({
            declarations: [OperatorVersionDialogComponent],
            imports: [FormsModule, MatSelectModule, NoopAnimationsModule],
            providers: [
                {provide: MAT_DIALOG_DATA, useValue: data},
                {provide: MatDialogRef, useValue: {close}},
            ],
        });
        fixture = TestBed.createComponent(OperatorVersionDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('offers newest first and then the versions newest first, marking deprecated ones', () => {
        create(dialogData(undefined));
        expect(component.options.map(option => option.label)).toEqual([
            'Newest (follows the operator)',
            'v2.0.0',
            'v1.5.0 (deprecated)',
            'v1.0.0',
        ]);
    });

    it('preselects newest for an unpinned node and the pin for a pinned one', () => {
        create(dialogData(undefined));
        expect(component.selected).toBe(NEWEST_VERSION);
        TestBed.resetTestingModule();
        create(dialogData('v1.5.0'));
        expect(component.selected).toBe('v1.5.0');
    });

    it('preselects newest when the pin is not offered any more', () => {
        create(dialogData('v0.1.0'));
        expect(component.selected).toBe(NEWEST_VERSION);
    });

    it('lists the links whose port the choice does not have', () => {
        create(dialogData(undefined));
        expect(component.removedLinks).toEqual([]);

        component.select('v1.0.0');
        expect(component.removedLinks.map(link => link.id)).toEqual(['in-b', 'out-p']);
        expect(component.differs('inPorts')).toBeTrue();

        component.select('v2.0.0');
        expect(component.removedLinks).toEqual([]);
        expect(component.differs('inPorts')).toBeFalse();
    });

    it('applies a pin with the ports and config of that version and the links to remove', () => {
        create(dialogData(undefined));
        component.select('v1.0.0');
        component.onApply();
        expect(close).toHaveBeenCalledWith({
            operatorVersion: 'v1.0.0',
            image: 'img:v1.0.0',
            inPorts: ['a'],
            outPorts: ['o'],
            config: [],
            removeLinkIds: ['in-b', 'out-p'],
        });
    });

    it('clears the pin and takes the top level when newest is chosen', () => {
        create(dialogData('v1.0.0'));
        component.select(NEWEST_VERSION);
        component.onApply();
        expect(close).toHaveBeenCalledWith({
            operatorVersion: undefined,
            image: 'img:v2.0.0',
            inPorts: ['a', 'b'],
            outPorts: ['o', 'p'],
            config: [{name: 'c', type: text}],
            removeLinkIds: [],
        });
    });

    it('opens for config entries without a type', () => {
        const data = dialogData(undefined);
        data.node.config = [{name: 'c'} as any];
        data.operator.config_values = [{name: 'c'} as any];
        create(data);
        expect(component.current.config).toBe('c ()');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Config:');
    });

    it('closes without a result on cancel', () => {
        create(dialogData(undefined));
        component.select('v1.0.0');
        component.onCancel();
        expect(close).toHaveBeenCalledOnceWith();
    });

    it('renders the options and the warning for the links to remove', () => {
        create(dialogData(undefined));
        component.select('v1.0.0');
        fixture.detectChanges();
        const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(content).toContain('will be removed');
        expect(content).toContain('Input "b" from source node');
        expect(content).toContain('Output "p" to target node');
        expect(content).not.toContain('Input "a"');
    });
});
