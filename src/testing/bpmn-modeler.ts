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

/** Imports the diagram and resolves with the messages of its import warnings. */
export function importXml(modeler: any, xml: string): Promise<string[]> {
    return new Promise((resolve, reject) =>
        modeler.importXML(xml, (err: any, warnings: any[]) => (err ? reject(err) : resolve((warnings || []).map((w) => w.message)))),
    );
}

export function saveXml(modeler: any): Promise<string> {
    return new Promise((resolve, reject) => modeler.saveXML((err: any, xml: string) => (err ? reject(err) : resolve(xml))));
}

export function saveSvg(modeler: any): Promise<string> {
    return new Promise((resolve, reject) => modeler.saveSVG((err: any, svg: string) => (err ? reject(err) : resolve(svg))));
}
