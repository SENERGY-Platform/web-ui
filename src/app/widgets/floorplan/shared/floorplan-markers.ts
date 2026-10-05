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

import { FloorplanWidgetCapabilityModel } from './floorplan.model';

export interface PlacementMarker {
    icon: string;
    color: string;
    showValue: boolean;
    showValueWhenZoomed: boolean;
    /** the displayed value with its unit, '' without value */
    label: string;
}

/**
 * Icon, colour and value label of a placement. A numeric value takes the first colouring whose value it
 * does not exceed (the last one above all), any other value the first colouring whose value matches it
 * as a regular expression (the last one without match). Without colouring the marker is a grey circle.
 */
export function placementMarker(placement: FloorplanWidgetCapabilityModel, unit: string | undefined): PlacementMarker {
    let color = 'grey';
    let zoom = false;
    let notZoom = false;
    let icon = 'circle';
    let value = placement.criteria.value?.message;
    const coloring = placement.coloring;
    if (coloring !== undefined && coloring.length > 0) {
        if (Array.isArray(value)) {
            if (value.length > 1) {
                value = value.join(', ');
            } else {
                value = value[0];
            }
        }

        if (typeof (value) === 'number' && !isNaN(value)) {
            icon = coloring[0].icon;
            color = coloring[0].color;
            zoom = coloring[0].showValueWhenZoomed;
            notZoom = coloring[0].showValue;
            for (let j = 1; j < coloring.length && value > (coloring[j - 1].value as number); j++) {
                icon = coloring[j].icon;
                color = coloring[j].color;
                zoom = coloring[j].showValueWhenZoomed;
                notZoom = coloring[j].showValue;
            }
        } else {
            const l = coloring.length;
            icon = coloring[l - 1].icon;
            color = coloring[l - 1].color;
            zoom = coloring[l - 1].showValueWhenZoomed;
            notZoom = coloring[l - 1].showValue;

            for (let j = 0; j < l; j++) {
                if (('' + value).match(new RegExp('' + coloring[j].value)) !== null) {
                    icon = coloring[j].icon;
                    color = coloring[j].color;
                    zoom = coloring[j].showValueWhenZoomed;
                    notZoom = coloring[j].showValue;
                    break;
                }
            }
        }
    }
    let label = value === undefined || value === null ? '' : '' + value;
    if (label.length > 0 && unit !== undefined) {
        label += ' ' + unit;
    }
    return { icon, color, showValue: notZoom, showValueWhenZoomed: zoom, label };
}

/** Canvas position of a placement, its relative position scaled onto the drawn image. */
export function placementPosition(
    placement: FloorplanWidgetCapabilityModel,
    image: { naturalWidth: number; naturalHeight: number },
    drawShift: { centerShiftX: number; centerShiftY: number; ratio: number },
): { x: number; y: number } {
    return {
        x: (placement.position.x || 0) * image.naturalWidth * drawShift.ratio + drawShift.centerShiftX,
        y: (placement.position.y || 0) * image.naturalHeight * drawShift.ratio + drawShift.centerShiftY,
    };
}

/** The text next to the marker icon: alias and/or value label as configured for the zoom state, joined by ': '. */
export function markerText(placement: FloorplanWidgetCapabilityModel, valueLabel: string, zoom: boolean, showValue: boolean, showValueWhenZoomed: boolean): string {
    const texts: string[] = [];
    if ((zoom && placement.showAliasWhenZoomed) || (!zoom && placement.showAlias)) {
        texts.push(placement.alias);
    }
    if ((zoom && showValueWhenZoomed) || (!zoom && showValue)) {
        texts.push(valueLabel);
    }
    return texts.join(': ');
}

/** A tooltip value: list values joined by ', ', the unit appended when known. */
export function tooltipValueLabel(message: any, unit: string | undefined): string {
    let label = '' + message;
    if (Array.isArray(message)) {
        if (message.length > 1) {
            label = message.join(', ');
        } else {
            label = message[0];
        }
    }
    if (unit !== undefined) {
        label += ' ' + unit;
    }
    return label;
}
