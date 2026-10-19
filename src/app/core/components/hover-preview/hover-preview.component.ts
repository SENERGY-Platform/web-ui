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

import { ChangeDetectionStrategy, Component, DestroyRef, Input, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { CdkOverlayOrigin, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

/**
 * Small image in a table cell that opens an enlarged copy beside it while hovered. The source is always an image URL
 * (a data URL for a stored SVG), never markup, so stored content is drawn and never run.
 */
@Component({
    selector: 'senergy-hover-preview',
    templateUrl: './hover-preview.component.html',
    styleUrls: ['./hover-preview.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CdkOverlayOrigin],
})
export class HoverPreviewComponent {
    @Input({ required: true }) src!: SafeUrl | string;
    @Input() alt = 'Preview';
    /** Draws the image on white, for diagrams with dark strokes and no background of their own. */
    @Input() onWhite = false;

    @ViewChild('overlayTpl', { static: true }) overlayTpl!: TemplateRef<unknown>;

    private overlay = inject(Overlay);
    private vcr = inject(ViewContainerRef);
    private overlayRef?: OverlayRef;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.close());
    }

    open(origin: CdkOverlayOrigin): void {
        if (this.overlayRef) {
            return;
        }
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(origin.elementRef)
            .withPositions([
                { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
                { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
            ]);
        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false,
        });
        this.overlayRef.attach(new TemplatePortal(this.overlayTpl, this.vcr));
    }

    close(): void {
        this.overlayRef?.dispose();
        this.overlayRef = undefined;
    }
}
