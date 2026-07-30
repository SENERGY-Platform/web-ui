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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReportObjectNode, inputTypeOfNode, isContainer } from '../../shared/report-object-node';
import { ReportObjectViewService } from '../../shared/report-object-view.service';

const TYPE_ICONS: { [key: string]: string } = {
    value: 'input',
    query: 'build',
    devices: 'devices',
};

@Component({
    selector: 'senergy-reporting-tree',
    templateUrl: './report-tree.component.html',
    styleUrls: ['./report-tree.component.css'],
})
export class ReportTreeComponent {

    @Input() nodes: ReportObjectNode[] = [];
    @Input() depth = 0;
    @Input() errorCounts: Map<string, number> = new Map<string, number>();
    @Input() filter = '';
    @Output() copyItem: EventEmitter<ReportObjectNode> = new EventEmitter();
    @Output() removeItem: EventEmitter<ReportObjectNode> = new EventEmitter();

    constructor(private viewService: ReportObjectViewService) {
    }

    get selectedPath(): string {
        return this.viewService.selectedPath;
    }

    /**
     * Hides objects that do not match the filter. A container stays visible as long as one of its nested objects
     * matches, so that the way to a match is never hidden.
     */
    visibleNodes(): ReportObjectNode[] {
        if (this.filter === '') {
            return this.nodes;
        }
        return this.nodes.filter((node: ReportObjectNode) => this.matches(node));
    }

    isExpanded(node: ReportObjectNode): boolean {
        return this.filter !== '' || this.viewService.isExpanded(node.path);
    }

    isContainer(node: ReportObjectNode): boolean {
        return isContainer(node);
    }

    icon(node: ReportObjectNode): string {
        if (isContainer(node)) {
            return node.data.fields !== undefined ? 'folder' : 'list';
        }
        return TYPE_ICONS[inputTypeOfNode(node)] || 'input';
    }

    /**
     * Value or query of the object, shown next to its name.
     */
    detail(node: ReportObjectNode): string {
        if (isContainer(node)) {
            return node.children.length + (node.data.fields !== undefined ? ' fields' : ' items');
        }
        switch (inputTypeOfNode(node)) {
        case 'query':
            return node.form.get('query.path')?.value || '';
        case 'devices':
            return node.form.get('deviceQuery.last')?.value || '';
        default:
            return node.form.controls['value']?.value || '';
        }
    }

    errors(node: ReportObjectNode): number {
        return this.errorCounts.get(node.path) || 0;
    }

    select(node: ReportObjectNode) {
        this.viewService.select(node.path);
        if (isContainer(node)) {
            this.viewService.expand(node.path);
        }
    }

    toggle(node: ReportObjectNode, $event: Event) {
        $event.stopPropagation();
        this.viewService.toggle(node.path);
    }

    emitCopyItem(node: ReportObjectNode, $event: Event) {
        $event.stopPropagation();
        this.copyItem.emit(node);
    }

    emitRemoveItem(node: ReportObjectNode, $event: Event) {
        $event.stopPropagation();
        this.removeItem.emit(node);
    }

    trackByPath(_: number, node: ReportObjectNode) {
        return node.path;
    }

    private matches(node: ReportObjectNode): boolean {
        if (node.path.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1) {
            return true;
        }
        return node.children.some((child: ReportObjectNode) => this.matches(child));
    }
}
