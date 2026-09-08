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

import { debounceTime, map, Subject, Subscription, switchMap } from 'rxjs';
import { collectMetadataUrnsFromObject, describeMissingMetadata } from './metadata-references';
import { MetadataExistenceService } from './metadata-existence.service';

const overlayType = 'missing-metadata';

// the canvas is redrawn on every edit, a short pause keeps the catalog lookup off the typing path
const refreshDelay = 300;

interface ElementUrns {
    id: string;
    urns: string[];
}

const escapeAttribute = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Marks the tasks and events of a bpmn-js canvas whose configuration points at platform metadata
 * that no longer exists. Only the extension elements and event definitions of an element are read,
 * so a warning always names the element that carries the reference.
 */
export class MissingMetadataOverlays {
    private modeler: any;
    private refresh = new Subject<void>();
    private subscription = new Subscription();
    private readonly onDiagramChange = () => this.refresh.next();

    constructor(private metadataExistenceService: MetadataExistenceService) {}

    attach(modeler: any): void {
        this.modeler = modeler;
        this.subscription.add(
            this.refresh
                .pipe(
                    debounceTime(refreshDelay),
                    switchMap(() => {
                        const referencing = this.referencingElements();
                        const urns = [...new Set(referencing.flatMap((element) => element.urns))];
                        return this.metadataExistenceService.findMissing(urns).pipe(map((missing) => ({ referencing, missing })));
                    }),
                )
                .subscribe(({ referencing, missing }) => this.render(referencing, missing)),
        );
        modeler.get('eventBus').on('import.done', this.onDiagramChange);
        modeler.get('eventBus').on('commandStack.changed', this.onDiagramChange);
    }

    detach(): void {
        this.subscription.unsubscribe();
        if (this.modeler) {
            this.modeler.get('eventBus').off('import.done', this.onDiagramChange);
            this.modeler.get('eventBus').off('commandStack.changed', this.onDiagramChange);
        }
    }

    private referencingElements(): ElementUrns[] {
        return this.modeler
            .get('elementRegistry')
            .getAll()
            .filter((element: any) => element.parent && !element.labelTarget && element.businessObject)
            .map((element: any) => ({
                id: element.id,
                urns: collectMetadataUrnsFromObject({
                    extensionElements: element.businessObject.extensionElements,
                    eventDefinitions: element.businessObject.eventDefinitions,
                }),
            }))
            .filter((element: ElementUrns) => element.urns.length > 0);
    }

    private render(referencing: ElementUrns[], missing: string[]): void {
        const overlays = this.modeler.get('overlays');
        overlays.remove({ type: overlayType });
        if (missing.length === 0) {
            return;
        }
        referencing.forEach((element) => {
            const missingHere = element.urns.filter((urn) => missing.includes(urn));
            if (missingHere.length === 0) {
                return;
            }
            overlays.add(element.id, overlayType, {
                position: { top: -12, right: 12 },
                html:
                    '<span class="missing-metadata-overlay material-icons" title="' +
                    escapeAttribute(describeMissingMetadata(missingHere)) +
                    '">report_problem</span>',
            });
        });
    }
}
