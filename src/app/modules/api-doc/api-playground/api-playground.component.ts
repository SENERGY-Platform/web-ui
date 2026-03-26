/*
 *
 *     Copyright 2026 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SwaggerService } from '../shared/swagger/swagger.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { markRaw } from 'vue';

import { createApiClientApp } from '@scalar/api-client';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { ActivatedRoute } from '@angular/router';

interface OpenapiDocument {
    id: string;
    title: string;
    content: any;
}

const routePrefix = '/dev/api/playground';

@Component({
    selector: 'senergy-openapi-docs',
    templateUrl: './api-playground.component.html',
    styleUrls: ['./api-playground.component.css'],
})
export class ApiPlaygroundComponent implements OnInit, OnDestroy {
    ready = false;
    documents: OpenapiDocument[] = [];
    private scalarClient?: any; // no types available, unfortunately

    @ViewChild('scalarContainer', { static: true }) scalarContainer!: ElementRef;

    constructor(public swaggerService: SwaggerService, private authService: AuthorizationService, private activatedRoute: ActivatedRoute) { }

    ngOnInit() {
        this.swaggerService.getSwagger().pipe(
            switchMap(list => {
                if (list.length === 0) {
                    return of([] as OpenapiDocument[]);
                }
                return forkJoin(list.map(item =>
                    this.swaggerService.getSingleSwagger(item.id).pipe(
                        catchError(err => {
                            console.error(`Failed to load spec for document ${item.title} (id: ${item.id}):`, err);
                            return of(undefined);
                        }),
                        map(spec => spec === undefined ? undefined : {
                            id: item.id,
                            title: item.title,
                            content: spec,
                        })
                    )
                ));
            })
        ).subscribe(async documents => {
            this.documents = documents.filter(d => d !== undefined).sort((a, b) => a!.title.localeCompare(b!.title)) as  OpenapiDocument[];
            if (this.documents.length === 0) {
                this.ready = true;
                return;
            }

            await this.loadDocuments();
            this.ready = true;
        });
    }

    ngOnDestroy() {
        this.scalarClient?.app?.unmount?.();
        this.scalarClient?.client?.app?.unmount?.();
    }

    private createUid(prefix?: string): string {
        const raw = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
        const compact = raw.replace(/-/g, '').slice(0, 8);
        return prefix ? `${prefix}-${compact}` : compact;
    }

    private async loadDocuments() {
        if (this.documents.length === 0) {
            return;
        }

        if (this.scalarClient !== undefined) {
            return;
        }
        const result = await createApiClientApp(
            this.scalarContainer.nativeElement,
            {
                plugins: [
                    () => ({
                        name: 'auth-plugin',
                        hooks: {
                            onBeforeRequest: async ({ request }: { request: Request }) => {
                                const token = await this.authService.getToken();
                                request.headers.set('Authorization', token);
                                return { request };
                            },
                        },
                    }),
                ],
                telemetry: false,

            },
        );
        result.client.resetStore();
        this.scalarClient = result;
        const portRx = /\D*(\d+)/;
        this.documents.forEach(async document => {
            const proxiedSpec = this.toScalarProxySpec(document.content);
            const collection = await result.client.store.importSpecFile(proxiedSpec, 'default');
            if (collection === undefined) {
                console.error(`Failed to import spec for document ${document.title}`);
                return;
            }
            if (collection?.servers[0].url.startsWith('http://')) {
                collection.servers[0].url = collection.servers[0].url.replace('http://', 'https://');
            }
            const port = document.id.match(portRx)?.[1];
            if (port && collection) {
                const localhostUid = (this.createUid(`localhost-${port}`) as unknown) as typeof collection.servers[number]['uid'];
                result.client.store.serverMutators.add(markRaw({ url: `http://localhost:${port}`, uid: localhostUid }), collection.collection.uid);

            }
        });

        result.router.beforeEach((to, _, next) => {
            if (!to.fullPath.startsWith(routePrefix)) {
                to.fullPath = `${routePrefix}${to.path}`;
            }
           next();
        });

        // restore route from url, default to first document if no specific route given
        result.router.push(this.activatedRoute.snapshot.url.join('/').replace(routePrefix, '') || '/workspace/default');
    }

    private toScalarProxySpec(spec: unknown): string | Record<string, any> | undefined {
        if (spec === undefined || spec === null) {
            return undefined;
        }

        if (typeof spec === 'string') {
            return spec;
        }

        if (typeof spec === 'object') {
            return markRaw(spec as Record<string, any>);
        }

        return String(spec);
    }
}
