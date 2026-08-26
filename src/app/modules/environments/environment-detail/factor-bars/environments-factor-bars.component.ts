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

import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { withFactorSet } from '../../shared/environments-source';

/**
 * A per-hour or per-weekday factor set (24 or 7 entries), edited as a small bar chart
 * instead of one tiny number field per slot -- those were unusable at their necessary
 * size. Click or drag across the bars to shape the day/week; the number field below sets
 * the last-touched bar exactly, for values a drag cannot reach precisely (or, once the
 * bars' scale has grown to fit an existing tall value, cannot reach at all by dragging --
 * see yMax()).
 *
 * `values` follows the same "undefined/wrong length means neutral" convention as the
 * hour_factors/weekday_factors fields themselves (see withFactorSet): this component never
 * shows a gap, only every slot at 1.
 */
@Component({
    selector: 'senergy-environments-factor-bars',
    templateUrl: './environments-factor-bars.component.html',
    styleUrls: ['./environments-factor-bars.component.css'],
})
export class EnvironmentsFactorBarsComponent implements OnChanges {
    @Input() values: number[] | undefined;
    @Input() count = 0;
    @Input() labels: string[] = [];
    /** Prepended to the label in the precise-value field below, e.g. 'Hour' + '14' -> "Hour 14". Weekday labels ('Thu') read fine on their own. */
    @Input() labelPrefix = '';
    @Output() valuesChange = new EventEmitter<number[]>();

    @ViewChild('track', { static: false }) trackRef: ElementRef<HTMLDivElement> | undefined;

    /** Always `count` entries; undefined/mismatched input is treated as all-neutral, same as the rest of the profile editor. */
    effectiveValues: number[] = [];
    /** The bar under the pointer right now (hover or drag), for the small value label above it. Undefined when the pointer is elsewhere. */
    hoverIndex: number | undefined;
    /** The last bar clicked or dragged onto -- what the precise-value field below edits. Starts at 0 so the field is usable before any interaction. */
    lastIndex = 0;
    private dragging = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['values'] || changes['count']) {
            this.effectiveValues = this.normalized(this.values);
            if (this.lastIndex >= this.count) {
                this.lastIndex = 0;
            }
        }
    }

    /** Top of the y-axis: at least 2, and at least the tallest bar, rounded up -- so a factor of 1 is never near the top and a taller value still fits. */
    get yMax(): number {
        const tallest = this.effectiveValues.reduce((max, v) => Math.max(max, v), 0);
        return Math.max(2, Math.ceil(tallest));
    }

    /** Where the "1 = unchanged" reference line sits, as a percent from the bottom of the track. */
    get referenceLinePercent(): number {
        return (1 / this.yMax) * 100;
    }

    heightPercent(value: number): number {
        return Math.max(0, Math.min(100, (value / this.yMax) * 100));
    }

    isNeutral(value: number): boolean {
        return value === 1;
    }

    labelFor(index: number): string {
        const label = this.labels[index] ?? String(index);
        return this.labelPrefix ? this.labelPrefix + ' ' + label : label;
    }

    onPointerDown(event: PointerEvent): void {
        const index = this.indexAt(event.clientX);
        if (index === undefined) {
            return;
        }
        this.dragging = true;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        this.applyPointer(index, event.clientY);
    }

    onPointerMove(event: PointerEvent): void {
        const index = this.indexAt(event.clientX);
        this.hoverIndex = index;
        if (this.dragging && index !== undefined) {
            this.applyPointer(index, event.clientY);
        }
    }

    onPointerUp(): void {
        this.dragging = false;
    }

    onPointerLeave(): void {
        if (!this.dragging) {
            this.hoverIndex = undefined;
        }
    }

    /** Bound to the precise-value field for `lastIndex`. */
    setPreciseValue(value: number): void {
        this.setValue(this.lastIndex, Number(value));
    }

    private applyPointer(index: number, clientY: number): void {
        const track = this.trackRef?.nativeElement;
        if (!track) {
            return;
        }
        const rect = track.getBoundingClientRect();
        const fraction = rect.height > 0 ? 1 - (clientY - rect.top) / rect.height : 0;
        const raw = Math.max(0, Math.min(1, fraction)) * this.yMax;
        this.setValue(index, Math.round(raw * 100) / 100);
    }

    private setValue(index: number, value: number): void {
        this.effectiveValues = withFactorSet(this.effectiveValues, this.count, index, value);
        this.lastIndex = index;
        this.hoverIndex = index;
        this.valuesChange.emit(this.effectiveValues);
    }

    private indexAt(clientX: number): number | undefined {
        const track = this.trackRef?.nativeElement;
        if (!track || this.count <= 0) {
            return undefined;
        }
        const rect = track.getBoundingClientRect();
        if (rect.width <= 0) {
            return undefined;
        }
        const fraction = (clientX - rect.left) / rect.width;
        return Math.max(0, Math.min(this.count - 1, Math.floor(fraction * this.count)));
    }

    private normalized(values: number[] | undefined): number[] {
        return values && values.length === this.count ? values : new Array(this.count).fill(1);
    }
}
