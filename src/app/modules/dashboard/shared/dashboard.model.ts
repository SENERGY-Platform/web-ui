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

/** Most columns a grid ever renders, and gridstack's own maximum. */
export const MAX_COLUMNS = 12;

/** Fewest columns a dashboard can be pinned to. */
export const MIN_COLUMNS = 1;

/**
 * Smallest a single grid unit may be, in px, in either direction. Below roughly this a widget stops
 * being able to show anything, so the grid is held to this per column and the page scrolls sideways
 * instead. Cells are square - gridstack's cellHeight default - so this floors the row height too.
 */
export const MIN_UNIT_PX = 330;

/**
 * Width bands that keep every column at least MIN_UNIT_PX wide, in the shape gridstack expects: each
 * `w` an upper bound, one pixel short of where the next column would fit, which makes the count
 * floor(width / MIN_UNIT_PX). gridstack's own columnWidth option rounds to nearest instead, and
 * rounding up is what lets a column fall under the target: at 525px a 350px target gives two of 262px.
 *
 * Widest first, and the order has to be ours: gridstack sorts breakpoints only while building a grid,
 * not in updateOptions(), so ascending bands handed to a live grid fail the first comparison and leave
 * the column count untouched.
 */
export const COLUMN_BANDS: { w: number; c: number }[] = Array.from(
    { length: MAX_COLUMNS },
    (_unused, index) => MAX_COLUMNS - index,
).map((columns) => ({ w: MIN_UNIT_PX * (columns + 1) - 1, c: columns }));

/**
 * A dashboard pinned to this many columns keeps them at every window width. Anything outside
 * MIN_COLUMNS..MAX_COLUMNS, or absent, means the count follows the width instead - see AUTO_COLUMNS.
 */
export const AUTO_COLUMNS = 0;

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
    /**
     * Columns to hold at every window width, or AUTO_COLUMNS to derive the count from the width.
     * Optional: absent while the dashboard service predates the field, which reads as auto.
     */
    columns?: number;
}
