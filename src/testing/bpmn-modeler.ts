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

/* Boots a designer modeler in the test page and wraps its import and export. */

export interface MountedModeler {
    modeler: any;
    destroy(): void;
}

export function mountModeler(create: (canvas: HTMLElement, panel: HTMLElement) => any): MountedModeler {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:800px;display:flex';
    const canvas = document.createElement('div');
    canvas.style.cssText = 'flex:1;height:100%';
    const panel = document.createElement('div');
    panel.style.cssText = 'width:260px;height:100%';
    host.appendChild(canvas);
    host.appendChild(panel);
    document.body.appendChild(host);
    const modeler = create(canvas, panel);
    // the components always set these; the panel renders the info entry from it
    modeler.designerCallbacks = { getInfoHtml: () => '' };
    return {
        modeler,
        destroy: () => {
            modeler.destroy();
            host.remove();
        },
    };
}

export async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${url}: ${response.status}`);
    }
    return response.text();
}

/**
 * Resolves once the properties panel has run its effects: it subscribes to selection changes in
 * one, which preact runs after the next frame (or after 100 ms without frames).
 */
export function panelSettled(): Promise<void> {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (!done) {
                done = true;
                setTimeout(resolve, 0);
            }
        };
        requestAnimationFrame(finish);
        setTimeout(finish, 150);
    });
}

/** Imports the diagram and resolves with the messages of its import warnings once the panel shows it. */
export async function importXml(modeler: any, xml: string): Promise<string[]> {
    const { warnings } = await modeler.importXML(xml);
    await panelSettled();
    return (warnings || []).map((w: any) => w.message);
}

export async function saveXml(modeler: any): Promise<string> {
    return (await modeler.saveXML()).xml;
}

export async function saveSvg(modeler: any): Promise<string> {
    return (await modeler.saveSVG()).svg;
}

/** Waits for a condition reached asynchronously, failing after `ms`. */
export async function until(condition: () => boolean, ms = 3000): Promise<void> {
    const start = Date.now();
    while (!condition()) {
        if (Date.now() - start > ms) {
            throw new Error('condition not reached within ' + ms + ' ms');
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
}
