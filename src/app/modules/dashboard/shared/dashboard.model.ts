/*
 * Copyright 2020 InfAI (CC SES)
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

import { WidgetModel } from './dashboard-widget.model';

/**
 * What a dashboard does with its widgets when the column count changes with the window width.
 * gridstack's own re-layout strategies, passed through as columnOpts.layout - minus the callback its
 * type also allows, which is no use as a menu entry.
 */
export type LayoutMode = 'compact' | 'list' | 'moveScale' | 'move' | 'scale' | 'none';

/** What the dashboard has always done, and what a dashboard with no stored mode reads as. */
export const DEFAULT_LAYOUT_MODE: LayoutMode = 'compact';

/** The modes offered in the layout menu, in the order they are listed. */
export const LAYOUT_MODES: { mode: LayoutMode; label: string; hint: string }[] = [
    { mode: 'compact', label: 'Compact', hint: 'Close any gap, reordering widgets if that helps' },
    { mode: 'list', label: 'Keep order', hint: 'Close gaps without ever reordering, so a gap can remain' },
    { mode: 'moveScale', label: 'Move and resize', hint: 'Move and resize every widget in proportion to the new width' },
    { mode: 'move', label: 'Move only', hint: 'Move widgets in proportion but leave their size alone' },
    { mode: 'scale', label: 'Resize only', hint: 'Resize widgets in proportion but leave their position alone' },
    { mode: 'none', label: 'Fixed', hint: 'Leave the arrangement alone, clamping only what no longer fits' },
];

export interface DashboardModel {
    id: string;
    name: string;
    user_id: string;
    refresh_time: number;
    widgets: WidgetModel[];
    index: number;
    updatedAt?: string;
    /** Optional: absent while the dashboard service predates the field - treat as DEFAULT_LAYOUT_MODE. */
    layout_mode?: LayoutMode;
}
