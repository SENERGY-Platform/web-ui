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

import { DatePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ElementSizeService } from '../../../core/services/element-size.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ChartsExportComponent } from './charts-export.component';
import { ChartsExportService } from './shared/charts-export.service';
import { ChartsExportViewState } from './charts-export-view-state';

/** What the export chart keeps in localStorage between visits: the key names and value shapes are the contract. */
interface ViewStateAccess {
    state: any;
    hasStoredState: () => boolean;
}

function widgetOf(properties: any = {}): WidgetModel {
    return { id: 'w1', name: 'w', type: 'charts_export', properties } as WidgetModel;
}

function componentAccess(widget: WidgetModel): ViewStateAccess {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: ChartsExportService, useValue: {} },
            { provide: ElementSizeService, useValue: {} },
            { provide: DashboardService, useValue: {} },
            { provide: ErrorHandlerService, useValue: {} },
            { provide: DatePipe, useValue: {} },
        ],
    });
    // never rendered: the view state does not depend on the template
    TestBed.overrideComponent(ChartsExportComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(ChartsExportComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('widget', widget);
    const state = component as any;
    return {
        state,
        hasStoredState: () => component.getCustomIcons(false).icons.includes('undo'),
    };
}

function classAccess(widget: WidgetModel): ViewStateAccess {
    const state = new ChartsExportViewState(() => widget);
    return { state, hasStoredState: () => state.hasStoredState() };
}

const ACCESSORS: [string, (widget: WidgetModel) => ViewStateAccess][] = [
    ['component', componentAccess],
    ['class', classAccess],
];

ACCESSORS.forEach(([accessorName, access]) => {
    describe('charts export view state through the ' + accessorName, () => {
        const axes = [{ exportName: 'A', valueName: 'v' }] as any[];

        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        it('reads the group time from the widget until one is stored, then prefers the stored one', () => {
            const { state } = access(widgetOf({ group: { time: '1d', type: 'sum' } }));
            expect(state.groupTime).toBe('1d');
            state.groupTime = '1h';
            expect(localStorage.getItem('w1_groupTime')).toBe('1h');
            expect(state.groupTime).toBe('1h');
        });

        it('has no group time without a stored one and without a widget grouping', () => {
            expect(access(widgetOf()).state.groupTime).toBeNull();
        });

        it('falls back to the widget for an empty stored group time and removes the key on null', () => {
            const { state } = access(widgetOf({ group: { time: '1d' } }));
            localStorage.setItem('w1_groupTime', '');
            expect(state.groupTime).toBe('1d');
            state.groupTime = '1h';
            state.groupTime = null;
            expect(localStorage.getItem('w1_groupTime')).toBeNull();
        });

        it('reads the axis format from the widget until one is stored', () => {
            const { state } = access(widgetOf({ hAxisFormat: 'MM.yyyy' }));
            expect(state.hAxisFormat).toBe('MM.yyyy');
            state.hAxisFormat = 'dd.MM.';
            expect(localStorage.getItem('w1_hAxisFormat')).toBe('dd.MM.');
            expect(state.hAxisFormat).toBe('dd.MM.');
            state.hAxisFormat = null;
            expect(localStorage.getItem('w1_hAxisFormat')).toBeNull();
            expect(state.hAxisFormat).toBe('MM.yyyy');
        });

        it('stores from and to as ISO strings and reads them back as dates', () => {
            const { state } = access(widgetOf());
            expect(state.from).toBeNull();
            expect(state.to).toBeNull();
            state.from = new Date('2026-03-01T10:00:00.000Z');
            state.to = new Date('2026-03-02T10:00:00.000Z');
            expect(localStorage.getItem('w1_from')).toBe('2026-03-01T10:00:00.000Z');
            expect(localStorage.getItem('w1_to')).toBe('2026-03-02T10:00:00.000Z');
            expect(state.from.getTime()).toBe(Date.parse('2026-03-01T10:00:00.000Z'));
            expect(state.to.getTime()).toBe(Date.parse('2026-03-02T10:00:00.000Z'));
            state.from = null;
            state.to = null;
            expect(localStorage.getItem('w1_from')).toBeNull();
            expect(localStorage.getItem('w1_to')).toBeNull();
        });

        it('reads a corrupt stored date as an invalid date without throwing', () => {
            const { state } = access(widgetOf());
            localStorage.setItem('w1_from', 'garbage');
            expect(Number.isNaN(state.from.getTime())).toBeTrue();
        });

        it('stores the modified axes as JSON and removes them on null', () => {
            const { state } = access(widgetOf());
            expect(state.modifiedVaxes).toBeNull();
            state.modifiedVaxes = axes;
            expect(localStorage.getItem('w1_modifiedvAxes')).toBe(JSON.stringify(axes));
            expect(state.modifiedVaxes).toEqual(axes);
            state.modifiedVaxes = null;
            expect(localStorage.getItem('w1_modifiedvAxes')).toBeNull();
        });

        it('throws on corrupt stored axes', () => {
            const { state } = access(widgetOf());
            localStorage.setItem('w1_modifiedvAxes', '{');
            expect(() => state.modifiedVaxes).toThrow();
        });

        it('stacks as the widget says until a value is stored', () => {
            const stacked = access(widgetOf({ stacked: true })).state;
            expect(stacked.stacked).toBeTrue();
            expect(access(widgetOf()).state.stacked).toBeFalse();
            stacked.stacked = false;
            expect(localStorage.getItem('w1_stacked')).toBe('false');
            expect(stacked.stacked).toBeFalse();
            stacked.stacked = true;
            expect(localStorage.getItem('w1_stacked')).toBe('true');
            stacked.stacked = null;
            expect(localStorage.getItem('w1_stacked')).toBeNull();
            expect(stacked.stacked).toBeTrue();
        });

        it('chooses no colors without a stored value and stores the flag as text', () => {
            const { state } = access(widgetOf());
            expect(state.chooseColors).toBeFalse();
            state.chooseColors = true;
            expect(localStorage.getItem('w1_chooseColors')).toBe('true');
            expect(state.chooseColors).toBeTrue();
            state.chooseColors = null;
            expect(localStorage.getItem('w1_chooseColors')).toBeNull();
            expect(state.chooseColors).toBeFalse();
        });

        it('keeps a drill stack that returns the latest entry first and drops the key when it is empty', () => {
            const { state } = access(widgetOf());
            expect(state.drillStackPeek()).toBeNull();
            expect(state.drillStackPop()).toBeNull();
            state.drillStackPush(axes, false);
            state.drillStackPush([], true);
            expect(JSON.parse(localStorage.getItem('w1_drillStack') as string)).toEqual([{ axes, stacked: false }, { axes: [], stacked: true }]);
            expect(state.drillStackPeek()).toEqual({ axes: [], stacked: true });
            expect(state.drillStackPop()).toEqual({ axes: [], stacked: true });
            expect(state.drillStackPeek()).toEqual({ axes, stacked: false });
            expect(state.drillStackPop()).toEqual({ axes, stacked: false });
            expect(localStorage.getItem('w1_drillStack')).toBeNull();
            expect(state.drillStackPeek()).toBeNull();
        });

        it('throws on a corrupt drill stack', () => {
            const { state } = access(widgetOf());
            localStorage.setItem('w1_drillStack', 'x');
            expect(() => state.drillStackPeek()).toThrow();
        });

        it('only touches keys of its own widget id', () => {
            const { state } = access(widgetOf());
            localStorage.setItem('other_groupTime', '1y');
            state.groupTime = '1h';
            expect(localStorage.getItem('other_groupTime')).toBe('1y');
        });

        it('has stored state once any key starts with the widget id, and not for other ids', () => {
            const { state, hasStoredState } = access(widgetOf());
            localStorage.setItem('other_groupTime', '1y');
            expect(hasStoredState()).toBeFalse();
            state.stacked = true;
            expect(hasStoredState()).toBeTrue();
        });
    });
});
