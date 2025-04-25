/*
 * Copyright 2025 InfAI (CC SES)
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

import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';

export interface FloorplanWidgetPropertiesModel {
    floorplan?: {
        image: string | null;
        placements: FloorplanWidgetCapabilityModel[];
    }
}

export interface FloorplanWidgetCapabilityModel {
    criteria: DeviceGroupCriteriaModel;
    alias: string;
    deviceGroupId: string | null;
    position: {
        x: number | null;
        y: number | null;
    },
    valueLow: number | null;
    valueHigh: number | null;
    colorLow: string | null;
    colorHigh: string | null;
}

export const dotSize = 10;

export function image(properties: FloorplanWidgetPropertiesModel): HTMLImageElement {
    const img = new Image();
    img.src = properties.floorplan?.image || '';
    return img;
}

export function draw(canvas: HTMLCanvasElement, properties: FloorplanWidgetPropertiesModel, options?: { color?: string, text?: string }[]): { centerShiftX: number; centerShiftY: number, ratio: number } {
    canvas.width = canvas.parentElement?.offsetWidth || 0;
    canvas.height = canvas.parentElement?.offsetHeight || 0;

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
        return { centerShiftY: NaN, centerShiftX: NaN, ratio: NaN };
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (properties.floorplan?.image === undefined) {
        return { centerShiftY: NaN, centerShiftX: NaN, ratio: NaN };
    }

    const img = image(properties);
    const hRatio = canvas.width / img.naturalWidth;
    const vRatio = canvas.height / img.naturalHeight;

    const ratio = Math.min(hRatio, vRatio);

    const centerShiftX = (canvas.width - img.width * ratio) / 2;
    const centerShiftY = (canvas.height - img.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

    properties.floorplan?.placements.forEach((p, i) => {
        ctx.beginPath();
        const x = (p.position.x || 0) * img.width * ratio + centerShiftX;
        const y = (p.position.y || 0) * img.height * ratio + centerShiftY;
        ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
        ctx.fillStyle = (options || [])[i]?.color || 'darkgrey';
        ctx.fill();
        if ((options || [])[i]?.text !== undefined) {
            ctx.font = '14px Arial';
            ctx.fillStyle = 'black';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText((options || [])[i].text || '', x, y);
        }
    });

    return { centerShiftX, centerShiftY, ratio };
}