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

import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Two columns for a tree and the form of its selected node: content marked `[treePanel]` goes left,
 * `[detailPanel]` right. Below 600px the tree stacks above the detail; each panel scrolls on its own.
 */
@Component({
    selector: 'senergy-tree-detail-layout',
    templateUrl: './tree-detail-layout.component.html',
    styleUrls: ['./tree-detail-layout.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class TreeDetailLayoutComponent {}
