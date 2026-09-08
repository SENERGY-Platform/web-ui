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

import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay } from 'rxjs';
import { FunctionsService } from '../functions/shared/functions.service';
import { DeviceClassesService } from '../device-classes/shared/device-classes.service';
import { CharacteristicsService } from '../characteristics/shared/characteristics.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { DeviceTypeAspectModel, DeviceTypeCharacteristicsModel } from '../device-types-overview/shared/device-type.model';
import { collectMetadataUrnsFromText, describeMissingMetadata, MetadataKind, metadataKindOf } from './metadata-references';

// the metadata lists are small enough to be read in one page; the same limit is used by the dialogs
// that offer them for selection
const listLimit = 9999;

/**
 * Answers which of the referenced metadata ids no longer exist. A kind whose catalog could not be
 * read completely is reported as intact: a failed request must not turn every model into a warning.
 */
@Injectable({
    providedIn: 'root',
})
export class MetadataExistenceService {
    private catalogs = new Map<MetadataKind, Observable<Set<string> | null>>();

    constructor(
        private functionsService: FunctionsService,
        private deviceClassesService: DeviceClassesService,
        private characteristicsService: CharacteristicsService,
        private deviceTypeService: DeviceTypeService,
    ) {}

    /**
     * Maps the key of every bpmn document that references missing metadata to the text of its
     * warning. Documents without a stale reference are absent from the result.
     */
    warningsForBpmn(documents: { key: string; bpmnXml: string }[]): Observable<Map<string, string>> {
        const referencing = documents
            .map((document) => ({ key: document.key, urns: collectMetadataUrnsFromText(document.bpmnXml) }))
            .filter((document) => document.urns.length > 0);
        const urns = [...new Set(referencing.flatMap((document) => document.urns))];
        if (urns.length === 0) {
            return of(new Map<string, string>());
        }
        return this.findMissing(urns).pipe(
            map((missing) => {
                const warnings = new Map<string, string>();
                referencing.forEach((document) => {
                    const missingHere = document.urns.filter((urn) => missing.includes(urn));
                    if (missingHere.length > 0) {
                        warnings.set(document.key, describeMissingMetadata(missingHere));
                    }
                });
                return warnings;
            }),
        );
    }

    findMissing(urns: string[]): Observable<string[]> {
        const kinds = [...new Set(urns.map(metadataKindOf).filter((kind): kind is MetadataKind => kind !== undefined))];
        if (kinds.length === 0) {
            return of([]);
        }
        return forkJoin(kinds.map((kind) => this.catalog(kind).pipe(map((ids) => ({ kind, ids }))))).pipe(
            map((catalogs) => {
                const byKind = new Map(catalogs.map((catalog) => [catalog.kind, catalog.ids]));
                return urns.filter((urn) => {
                    const kind = metadataKindOf(urn);
                    const ids = kind ? byKind.get(kind) : undefined;
                    return !!ids && !ids.has(urn);
                });
            }),
        );
    }

    private catalog(kind: MetadataKind): Observable<Set<string> | null> {
        const cached = this.catalogs.get(kind);
        if (cached) {
            return cached;
        }
        const loaded = this.load(kind).pipe(shareReplay(1));
        this.catalogs.set(kind, loaded);
        return loaded;
    }

    private load(kind: MetadataKind): Observable<Set<string> | null> {
        switch (kind) {
        case 'function':
            return this.functionsService
                .getFunctions('', listLimit, 0, 'name', 'asc')
                .pipe(map((page) => this.toCatalog(page.result.map((f) => f.id), page.total)));
        case 'device-class':
            return this.deviceClassesService
                .getDeviceClasses('', listLimit, 0, 'name', 'asc')
                .pipe(map((page) => this.toCatalog(page.result.map((c) => c.id), page.total)));
        case 'characteristic':
            return this.characteristicsService
                .getCharacteristics('', listLimit, 0, 'name', 'asc')
                .pipe(map((page) => this.toCatalog(flattenCharacteristicIds(page.result), page.total)));
        case 'aspect':
            return this.deviceTypeService.getAspects().pipe(map((aspects) => this.toCatalog(flattenAspectIds(aspects), 0)));
        }
    }

    /**
     * An empty catalog means the request failed or was answered with nothing usable, a truncated one
     * would report existing ids as missing. Both cases give up rather than warn.
     */
    private toCatalog(ids: (string | undefined)[], total: number): Set<string> | null {
        const known = new Set(ids.filter((id): id is string => !!id));
        if (known.size === 0 || total > known.size) {
            return null;
        }
        return known;
    }
}

const flattenAspectIds = (aspects: DeviceTypeAspectModel[]): string[] =>
    aspects.flatMap((aspect) => [aspect.id, ...flattenAspectIds(aspect.sub_aspects || [])]);

const flattenCharacteristicIds = (characteristics: DeviceTypeCharacteristicsModel[]): (string | undefined)[] =>
    characteristics.flatMap((characteristic) => [
        characteristic.id,
        ...flattenCharacteristicIds(characteristic.sub_characteristics || []),
    ]);
