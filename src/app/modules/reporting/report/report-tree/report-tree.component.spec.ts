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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ReportTreeComponent } from './report-tree.component';
import { ReportObjectModel } from '../../shared/reporting.model';
import { buildReportObjectsForm } from '../../shared/report-object-form';
import { ReportObjectNode, buildReportObjectNodes, findNode } from '../../shared/report-object-node';
import { ReportObjectViewService } from '../../shared/report-object-view.service';

const objects = (): { [key: string]: ReportObjectModel } => ({
    title: { name: 'title', valueType: 'string', value: 'Report title' } as ReportObjectModel,
    table: {
        name: 'table', valueType: 'array', length: 1,
        children: {
            '0': {
                name: 'consumption', valueType: 'float64',
                query: { columns: [{ name: 'root.value' }], deviceId: 'd1', serviceId: 's1' },
            } as ReportObjectModel,
        },
    } as unknown as ReportObjectModel,
});

describe('ReportTreeComponent', () => {
    let component: ReportTreeComponent;
    let fixture: ComponentFixture<ReportTreeComponent>;
    let viewService: ReportObjectViewService;
    let nodes: ReportObjectNode[];

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ReportTreeComponent],
            imports: [CommonModule, NoopAnimationsModule, MatButtonModule, MatIconModule, MatTooltipModule],
            providers: [ReportObjectViewService],
        }).compileComponents();
        fixture = TestBed.createComponent(ReportTreeComponent);
        component = fixture.componentInstance;
        viewService = TestBed.inject(ReportObjectViewService);
        const data = objects();
        nodes = buildReportObjectNodes(data, buildReportObjectsForm(data));
        component.nodes = nodes;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show an icon per input type', () => {
        expect(component.icon(findNode(nodes, 'title')!)).toBe('input');
        expect(component.icon(findNode(nodes, 'table')!)).toBe('list');
        expect(component.icon(findNode(nodes, 'table.0')!)).toBe('build');
    });

    it('should describe the objects', () => {
        expect(component.detail(findNode(nodes, 'title')!)).toBe('Report title');
        expect(component.detail(findNode(nodes, 'table')!)).toBe('1 items');
        expect(component.detail(findNode(nodes, 'table.0')!)).toBe('root.value');
    });

    it('should select an object and open it if it is a container', () => {
        component.select(findNode(nodes, 'table')!);

        expect(component.selectedPath).toBe('table');
        expect(component.isExpanded(findNode(nodes, 'table')!)).toBe(true);
    });

    it('should toggle a container without selecting it', () => {
        const table = findNode(nodes, 'table')!;
        const event = new MouseEvent('click');
        spyOn(event, 'stopPropagation');

        component.toggle(table, event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.isExpanded(table)).toBe(true);
        expect(component.selectedPath).toBe('');
    });

    it('should show the error count of an object', () => {
        component.errorCounts = new Map<string, number>([['table', 2]]);

        expect(component.errors(findNode(nodes, 'table')!)).toBe(2);
        expect(component.errors(findNode(nodes, 'title')!)).toBe(0);
    });

    it('should filter by path and keep the way to a match', () => {
        component.filter = 'consumption';
        expect(component.visibleNodes().map((node: ReportObjectNode) => node.path)).toEqual([]);

        component.filter = 'table.0';
        expect(component.visibleNodes().map((node: ReportObjectNode) => node.path)).toEqual(['table']);
        expect(component.isExpanded(findNode(nodes, 'table')!)).toBe(true);

        component.filter = 'title';
        expect(component.visibleNodes().map((node: ReportObjectNode) => node.path)).toEqual(['title']);
    });

    it('should emit the item actions', () => {
        const copied: ReportObjectNode[] = [];
        const removed: ReportObjectNode[] = [];
        component.copyItem.subscribe((node: ReportObjectNode) => copied.push(node));
        component.removeItem.subscribe((node: ReportObjectNode) => removed.push(node));
        const item = findNode(nodes, 'table.0')!;

        component.emitCopyItem(item, new MouseEvent('click'));
        component.emitRemoveItem(item, new MouseEvent('click'));

        expect(copied).toEqual([item]);
        expect(removed).toEqual([item]);
    });

    /**
     * The global icon stylesheet of the application makes every icon inline-block, which shifts the icons inside the
     * material icon buttons below the middle of the row unless the buttons center them themselves.
     */
    it('should align the icons with the row', () => {
        const iconStyles = document.createElement('style');
        iconStyles.textContent = '.material-icons { font-size: 24px; display: inline-block; line-height: 1; }';
        document.head.insertBefore(iconStyles, document.head.firstChild);
        viewService.expand('table');
        const host = fixture.nativeElement as HTMLElement;
        host.style.width = '340px';
        fixture.detectChanges();

        const rows = Array.from(host.querySelectorAll('.tree-row')) as HTMLElement[];
        const offsets = rows.flatMap((row: HTMLElement) => {
            const rowCenter = row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
            return Array.from(row.querySelectorAll('mat-icon')).map((icon: Element) => {
                const rect = icon.getBoundingClientRect();
                return Math.abs(rect.top + rect.height / 2 - rowCenter);
            });
        });

        iconStyles.remove();
        expect(rows.length).toBeGreaterThan(1);
        expect(offsets.length).toBeGreaterThan(1);
        offsets.forEach((offset: number) => expect(offset).toBeLessThan(2));
    });

    it('should keep the selection in the view service', () => {
        viewService.select('title');

        expect(component.selectedPath).toBe('title');
    });
});
