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

import Map from 'ol/Map';
import View from 'ol/View';
import VectorTileLayer from 'ol/layer/VectorTile';
import { transformExtent, useGeographic } from 'ol/proj';

/** A section of the map as [west, south, east, north] in degrees */
export type MapSection = number[];

/** The vector style of basemap.de the dashboard draws its map with */
const basemapStyleUrl = 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json';

/**
 * The basemap of basemap.de, drawn from vector tiles, so it stays sharp at any zoom. It covers Germany and its
 * borders; elsewhere the map stays empty. Resolves once the style is applied. The style library is loaded only
 * here, since it is needed only while a section is chosen or drawn.
 */
export async function basemapLayer(): Promise<VectorTileLayer> {
    const { applyBackground, applyStyle } = await import('ol-mapbox-style');
    const layer = new VectorTileLayer({ declutter: true });
    await Promise.all([
        // a font the browser lacks would be fetched from a CDN, the text takes the app's fonts instead
        applyStyle(layer, basemapStyleUrl, { webfonts: 'data:text/css,' }),
        applyBackground(layer, basemapStyleUrl),
    ]);
    return layer;
}

/** The credit the licence of basemap.de asks for, with the year the tiles were fetched in */
export function basemapAttribution(year = new Date().getFullYear()): string {
    return `© ${year} basemap.de / BKG | Datenquellen: © GeoBasis-DE`;
}

/** Writes the credit into the bottom right corner of the image, smaller where the image is too narrow for it */
function drawAttribution(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, text: string) {
    const padding = 3;
    const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `11px ${family}`;
    const fontSize = 11 * Math.min(1, (canvas.width - 2 * padding) / ctx.measureText(text).width);
    ctx.font = `${fontSize}px ${family}`;
    const width = ctx.measureText(text).width + 2 * padding;
    const height = fontSize + 2 * padding;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(canvas.width - width, canvas.height - height, width, height);
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width - width + padding, canvas.height - height / 2);
}

/**
 * Draws what the map shows into a single image, one pixel per CSS pixel, which keeps it in the size range
 * of an uploaded image, with the attribution written into it, so it stays with the image. Resolves once the
 * tiles of the section are loaded. Rejects when a layer cannot be read back, which is the case for a tile
 * source without cross-origin access.
 */
export function mapSnapshot(map: Map, attribution?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        map.once('rendercomplete', () => {
            try {
                const size = map.getSize();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (size === undefined || ctx === null) {
                    reject(new Error('the map is not rendered'));
                    return;
                }
                canvas.width = Math.round(size[0]);
                canvas.height = Math.round(size[1]);
                map.getViewport().querySelectorAll<HTMLCanvasElement>('.ol-layer canvas, canvas.ol-layer').forEach(layer => {
                    if (layer.width === 0) {
                        return;
                    }
                    // a layer canvas is placed in the viewport by a CSS transform, which maps its pixels to CSS pixels
                    const m = layer.style.transform.match(/^matrix\(([^(]*)\)$/)?.[1].split(',').map(Number)
                        ?? [parseFloat(layer.style.width) / layer.width, 0, 0, parseFloat(layer.style.height) / layer.height, 0, 0];
                    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
                    ctx.drawImage(layer, 0, 0);
                });
                if (attribution !== undefined) {
                    drawAttribution(canvas, ctx, attribution);
                }
                resolve(canvas.toDataURL('image/webp', 0.9));
            } catch (e) {
                reject(e);
            }
        });
        map.render();
    });
}

/**
 * Draws a section at the size the widget shows it, independent of the map it was chosen on, so the tiles are
 * those of the widget's resolution. Resolves with the image and the section it covers, which differs from the
 * requested one by less than a pixel.
 */
export async function renderSection(section: MapSection, size: number[]): Promise<{ image: string; section: MapSection }> {
    useGeographic();
    // the style has to be applied before the first render, or that render completes with nothing drawn
    const layer = await basemapLayer();
    // laid out but out of sight, a map renders only into an element with a size
    const target = document.createElement('div');
    target.style.cssText = `position: fixed; left: -100000px; top: 0; width: ${size[0]}px; height: ${size[1]}px;`;
    document.body.appendChild(target);
    const map = new Map({
        target,
        pixelRatio: 1,
        controls: [],
        interactions: [],
        layers: [layer],
        view: new View({ enableRotation: false }),
    });
    try {
        map.getView().fit(section, { size });
        const covered = map.getView().calculateExtent(size);
        return { image: await mapSnapshot(map, basemapAttribution()), section: covered };
    } finally {
        map.setTarget(undefined);
        target.remove();
    }
}

/**
 * The position a placement has in another section, pointing at the same spot on the map. Positions are
 * fractions of the image, and the image is linear in Web Mercator, not in degrees. A spot outside the
 * other section has no position there.
 */
export function moveIntoSection(position: { x: number | null; y: number | null }, from: MapSection, to: MapSection): { x: number | null; y: number | null } {
    if (position.x === null || position.y === null) {
        return position;
    }
    const [fromWest, fromSouth, fromEast, fromNorth] = transformExtent(from, 'EPSG:4326', 'EPSG:3857');
    const [toWest, toSouth, toEast, toNorth] = transformExtent(to, 'EPSG:4326', 'EPSG:3857');
    const mercatorX = fromWest + position.x * (fromEast - fromWest);
    const mercatorY = fromNorth - position.y * (fromNorth - fromSouth);
    const x = (mercatorX - toWest) / (toEast - toWest);
    const y = (toNorth - mercatorY) / (toNorth - toSouth);
    if (x < 0 || x > 1 || y < 0 || y > 1) {
        return { x: null, y: null };
    }
    return { x, y };
}
