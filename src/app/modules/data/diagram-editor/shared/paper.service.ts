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

import { Injectable } from '@angular/core';
import { dia } from 'jointjs';

@Injectable({
    providedIn: 'root'
})
export class PaperService {
    private paper!: dia.Paper;
    private readonly GRID_SIZE = 20;

    private readonly DEFAULT_LINK_ATTRS = {
        '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z' }
    };

    /**
     * Initialize the paper
     */
    public initialize(
        containerId: string,
        width: number,
        height: number,
        graph: dia.Graph
    ): void {
        const container = document.getElementById(containerId);

        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.paper = new dia.Paper({
            el: container,
            model: graph,
            defaultLink: this.createDefaultLink(),
            width,
            height,
            gridSize: this.GRID_SIZE,
            linkPinning: true,
            snapLinks: true,
            drawGrid: { name: 'mesh' },
            embeddingMode: false,
            validateConnection: this.validateConnection,
            markAvailable: true,
        });
    }

    /**
     * Get the paper instance
     */
    public getPaper(): dia.Paper {
        return this.paper;
    }

    /**
     * Create a default link with standard styling
     */
    private createDefaultLink(): dia.Link {
        return new dia.Link({
            attrs: this.DEFAULT_LINK_ATTRS,
        });
    }

    /**
     * Validate whether a connection between two ports is allowed
     */
    private validateConnection(
        sourceView: dia.CellView,
        sourceMagnet: SVGElement,
        targetView: dia.CellView,
        targetMagnet: SVGElement
    ): boolean {
        // Prevent linking from input ports
        if (sourceMagnet?.getAttribute('port-group') === 'in') {
            return false;
        }

        // Prevent self-connections
        if (sourceView === targetView) {
            return false;
        }

        // Only allow connections to input ports
        return targetMagnet?.getAttribute('port-group') === 'in';
    }

    /**
     * Set paper dimensions
     */
    public setDimensions(width: number, height: number): void {
        this.paper.setDimensions(width, height);
    }

    /**
     * Scale the paper
     */
    public scale(sx: number, sy: number): void {
        this.paper.scale(sx, sy);
    }

    /**
     * Get current scale
     */
    public getScale(): { sx: number; sy: number } {
        return this.paper.scale();
    }

    /**
     * Destroy the paper instance
     */
    public destroy(): void {
        if (this.paper) {
            this.paper.remove();
        }
    }

    /**
     * Export paper as SVG
     */
    public toSVG(): SVGElement {
        return this.paper.svg;
    }

    /**
     * Get paper dimensions
     */
    public getDimensions(): { width: dia.Paper.Dimension ; height: dia.Paper.Dimension } {
        const options = this.paper.options;
        if (options.width == null) {
            options.width = 0 ;
        }
        if (options.height == null) {
            options.height = 0;
        }
        return {
            width: options.width,
            height: options.height
        };
    }
}