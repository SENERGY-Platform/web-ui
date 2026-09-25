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

/*
 * This is the only module in the app that imports cytoscape/cytoscape-dagre, and it must
 * stay that way: it may only ever be reached through `await import(...)`. A static import
 * from anywhere would pull both libraries into that importer's bundle, which is the whole
 * thing environments-effects.component.ts's dynamic import avoids.
 */
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';

export type { Core, EdgeDefinition, ElementDefinition, NodeDefinition, NodeSingular } from 'cytoscape';

/** The value loadCytoscape() hands back: the cytoscape factory function, dagre already registered on it. */
export type CytoscapeFactory = typeof cytoscape;

let registered = false;

/** Registers the dagre layout extension exactly once, however many times the effects tab is opened. */
export function loadCytoscape(): CytoscapeFactory {
    if (!registered) {
        registered = true;
        cytoscape.use(cytoscapeDagre);
    }
    return cytoscape;
}
