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

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

/** A place found by the address search */
export interface PhotonHit {
    label: string;
    lon: number;
    lat: number;
    /** [west, south, east, north] in degrees, for a hit covering an area such as a street or a town */
    extent?: number[];
}

export interface PhotonProperties {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
    /** [west, north, east, south] in degrees */
    extent?: number[];
}

export interface PhotonResponse {
    features?: {
        properties: PhotonProperties;
        /** [lon, lat] */
        geometry: { coordinates: number[] };
    }[];
}

/** Hits shorter than this are not searched for, they mostly return noise */
export const photonMinQueryLength = 3;

/**
 * One line per hit. Photon answers one feature per OpenStreetMap object, so several buildings at one address
 * come back as separate hits; their name, put in front of the street, tells them apart.
 */
export function photonLabel(p: PhotonProperties): string {
    const street = [p.street, p.housenumber].filter(s => !!s).join(' ');
    const locality = [p.postcode, p.city].filter(s => !!s).join(' ');
    const parts = [p.name !== p.street ? p.name : undefined, street, locality, p.country];
    return parts.filter((part, i, all): part is string => !!part && all.indexOf(part) === i).join(', ');
}

/** Hits with the same label closer than this, in degrees, are one place: about 100 m */
const samePlaceDegrees = 0.001;

/**
 * The hits of an answer in Photon's ranking. A label repeated close by is listed once; towns of the same name
 * far apart are all kept.
 */
export function photonHits(response: PhotonResponse | null): PhotonHit[] {
    const hits: PhotonHit[] = [];
    (response?.features || []).forEach(f => {
        const label = photonLabel(f.properties);
        const [lon, lat] = f.geometry.coordinates;
        if (label === '' || hits.some(h => h.label === label && Math.abs(h.lon - lon) < samePlaceDegrees && Math.abs(h.lat - lat) < samePlaceDegrees)) {
            return;
        }
        const e = f.properties.extent;
        hits.push({
            label,
            lon,
            lat,
            extent: e?.length === 4 ? [Math.min(e[0], e[2]), Math.min(e[1], e[3]), Math.max(e[0], e[2]), Math.max(e[1], e[3])] : undefined,
        });
    });
    return hits;
}

/** The Photon geocoder of the platform, behind the gateway */
@Injectable({
    providedIn: 'root',
})
export class PhotonService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);
    private ladonService = inject(LadonService);

    /** The gateway refuses the search without a policy for the client and the role, a missing rule is no right */
    userMaySearch(): boolean {
        return this.ladonService.getUserAuthorizationsForURI(environment.photonUrl + '/api')?.GET === true;
    }

    search(query: string): Observable<PhotonHit[]> {
        return this.http.get<PhotonResponse>(environment.photonUrl + '/api', { params: { q: query, limit: 5 } }).pipe(
            catchError(this.errorHandlerService.handleError<PhotonResponse | null>(PhotonService.name, 'search', null)),
            map(photonHits),
        );
    }
}
