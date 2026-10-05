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
import { dia, g } from '@joint/core';
import { createLinkTools, LinkDefinition } from './link-definition';

@Injectable({
    providedIn: 'root'
})
export class PaperService {
    private paper!: dia.Paper;
    private readonly GRID_SIZE = 20;

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
            // JointJS 3 defaults, changed in @joint/core 4: DOM order follows z without comment pivots, links end at the port bbox
            sorting: dia.Paper.sorting.EXACT,
            defaultConnectionPoint: { name: 'bbox' },
            // dragging a link body adds a vertex (see createLinkTools) instead of moving the link
            interactive: { labelMove: false, linkMove: false },
        });
        const paper = this.paper;
        paper.findClosestMagnetToPoint = (point, opt) => this.findClosestMagnet(paper, point, opt);
        this.addToolsOnFirstHover(paper);
    }

    /**
     * Gives a link its tools the first time the pointer is over it and never removes them: as in JointJS 3 the
     * stylesheet shows them only while the link is hovered, so no drag can lose a tool that is handling it.
     */
    private addToolsOnFirstHover(paper: dia.Paper): void {
        paper.el.addEventListener('mouseover', (evt) => {
            const view = paper.findView(evt.target as SVGElement);
            if (view?.model.isLink() && !view.hasTools()) {
                view.addTools(createLinkTools());
            }
        });
    }

    /**
     * Snapping as in JointJS 3: the valid magnet nearest by its centre, of any element whose view reaches into the radius.
     * @joint/core 4.2 also requires the magnet itself to lie within the radius.
     */
    private findClosestMagnet(
        paper: dia.Paper,
        point: dia.Point,
        opt: dia.Paper.FindClosestMagnetToPointOptions = {}
    ): dia.Paper.ClosestMagnet | null {
        const radius = opt.radius || 50;
        const area = new g.Rect(point.x - radius, point.y - radius, 2 * radius, 2 * radius);
        const pointer = new g.Point(point);
        let closest: dia.Paper.ClosestMagnet | null = null;
        let minDistance = Number.MAX_VALUE;
        for (const element of paper.model.getElements()) {
            const view = paper.findViewByModel(element);
            if (!view || !area.intersect(view.vel.getBBox({ target: paper.layers }))) {
                continue;
            }
            const candidates: { magnet: SVGElement; bbox: g.Rect }[] = [];
            if (view.el.getAttribute('magnet') !== 'false') {
                candidates.push({ magnet: view.el as SVGElement, bbox: element.getBBox() });
            }
            view.el.querySelectorAll<SVGElement>('[magnet]').forEach((magnet) => candidates.push({ magnet, bbox: view.getNodeBBox(magnet) }));
            for (const { magnet, bbox } of candidates) {
                const distance = bbox.center().squaredDistance(pointer);
                if (distance < minDistance && (!opt.filter || opt.filter(view, magnet))) {
                    minDistance = distance;
                    closest = { view, magnet };
                }
            }
        }
        return closest;
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
        return new LinkDefinition();
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