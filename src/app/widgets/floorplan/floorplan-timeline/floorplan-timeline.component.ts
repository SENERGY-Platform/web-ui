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

import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatTooltip } from '@angular/material/tooltip';
import { HistoryFrame } from '../shared/floorplan-history';

/** How long one moment stays on the map at each speed, in milliseconds. */
const SPEEDS = [{ label: '1x', delay: 500 }, { label: '2x', delay: 250 }, { label: '4x', delay: 125 }];

/**
 * The bar that replays the moments of a floorplan. It holds the position and the playing, and reports
 * which moment is to be drawn; loading the moments and drawing them is the widget's own business.
 */
@Component({
    selector: 'senergy-floorplan-timeline',
    templateUrl: './floorplan-timeline.component.html',
    styleUrl: './floorplan-timeline.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon, MatIconButton, MatSlider, MatSliderThumb, MatTooltip, DatePipe],
})
export class FloorplanTimelineComponent {
    private destroyRef = inject(DestroyRef);

    readonly frames = input<HistoryFrame[]>([]);
    readonly loading = input(false);
    /** the moment on the map, which the widget holds, so the bar needs no state of its own for it */
    readonly index = input(0);

    /** the moment to draw, by its index in the frames */
    readonly moment = output<number>();
    /** the viewer left the replay and wants the current values back */
    readonly leave = output<void>();

    readonly playing = signal(false);
    readonly speed = signal(0);
    readonly speeds = SPEEDS;

    /** Window timer of the running replay, 0 while it is paused. */
    private timer = 0;

    constructor() {
        this.destroyRef.onDestroy(() => this.stop());
    }

    get current(): Date | undefined {
        return this.frames()[this.index()]?.time;
    }

    toggle(): void {
        if (this.playing()) {
            this.stop();
            return;
        }
        if (this.frames().length < 2) {
            return;
        }
        // playing on from the end would stand still, so it starts over
        if (this.index() >= this.frames().length - 1) {
            this.moment.emit(0);
        }
        this.playing.set(true);
        this.tick();
    }

    /** Draws the moment at that index and stops the replay there. */
    pick(index: number): void {
        this.stop();
        this.moment.emit(index);
    }

    setSpeed(index: number): void {
        this.speed.set(index);
        if (this.playing()) {
            // the new delay takes effect with the next moment rather than the one being shown
            window.clearTimeout(this.timer);
            this.tick();
        }
    }

    stop(): void {
        this.playing.set(false);
        window.clearTimeout(this.timer);
        this.timer = 0;
    }

    private tick(): void {
        this.timer = window.setTimeout(() => {
            const next = this.index() + 1;
            if (next >= this.frames().length) {
                this.stop();
                return;
            }
            this.moment.emit(next);
            this.tick();
        }, SPEEDS[this.speed()].delay);
    }
}
