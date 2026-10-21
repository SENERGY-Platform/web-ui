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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PipelineDetailsComponent } from './pipeline-details.component';
import { PipelineRegistryService } from '../shared/pipeline-registry.service';
import { PipelineModel } from '../shared/pipeline.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { FlowEngineService } from '../../flow-repo/shared/flow-engine.service';
import { DeviceInstancesService } from '../../../devices/device-instances/shared/device-instances.service';
import { decodeSvgDataUrl, HOSTILE_IMAGE, liveMarkup } from '../../../../core/svg-image.mock';

describe('PipelineDetailsComponent image', () => {
    let fixture: ComponentFixture<PipelineDetailsComponent>;

    beforeEach(() => {
        delete (window as any).svgImageXss;
        const pipeline = { id: 'pipe-1', name: 'a pipeline', flowId: 'flow-1', operators: [], image: HOSTILE_IMAGE } as unknown as PipelineModel;
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [PipelineDetailsComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => pipeline.id } } } },
                { provide: PipelineRegistryService, useValue: { getPipeline: () => of(pipeline) } },
                { provide: DeviceTypeService, useValue: {} },
                { provide: DeviceInstancesService, useValue: {} },
                { provide: FlowEngineService, useValue: { userHasUpdateAuthorization: () => true } },
            ],
        });
        fixture = TestBed.createComponent(PipelineDetailsComponent);
        fixture.detectChanges();
    });

    it('shows the stored image as an img with a data URL, never as markup in the page', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const container = fixture.nativeElement.querySelector('.widget-image') as HTMLElement;

        const img = container.querySelector('img') as HTMLImageElement;
        expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
        // the standalone checkbox draws its own svg, so the page is searched for the image's nodes instead
        expect(container.querySelectorAll('svg').length).toBe(0);
        expect(fixture.nativeElement.querySelector('[model-id]')).toBeNull();
        expect(liveMarkup(container)).toEqual([]);
        expect((window as any).svgImageXss).toBeUndefined();
    });

    it('gives the image the height of its viewBox, so it is drawn at its own size', () => {
        const image = decodeSvgDataUrl((fixture.nativeElement.querySelector('.widget-image img') as HTMLImageElement).src);

        expect(image.documentElement.getAttribute('height')).toBe('100');
        expect(image.documentElement.getAttribute('viewBox')).toBe('0 0 200 100');
        expect(image.querySelector('[model-id="op-1"] > rect')).withContext('the operator is drawn').not.toBeNull();
    });
});

/** The visible text, one entry per text node, without icon ligatures. */
const texts = (root: HTMLElement): string[] => {
    const found: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text !== '' && node.parentElement?.closest('mat-icon') === null) {
            found.push(text);
        }
    }
    return found;
};

describe('PipelineDetailsComponent values', () => {
    let fixture: ComponentFixture<PipelineDetailsComponent>;
    let page: HTMLElement;
    let updateRight = true;

    const pipeline = {
        id: 'pipe-1',
        name: 'a pipeline',
        description: 'what it does',
        flowId: 'flow-1',
        operators: [
            {
                id: 'op-1', name: 'Averager', imageId: 'img-1',
                config: new Map([['window', '5'], ['unit', 'min']]),
                inputTopics: [
                    { name: 'urn_infai_ses_service_1', filterType: 'DeviceId', filterValue: 'dev-1,dev-2,dev-3', mappings: [{ source: 'value.level', dest: 'level' }] },
                    { name: 'upstream', filterType: 'OperatorId', filterValue: 'o1:p2', mappings: [{ source: 'a', dest: 'b' }] },
                    { name: 'hidden topic', filterType: 'OperatorId', filterValue: 'plain', mappings: [] },
                ],
            },
            { id: 'op-2', name: 'Second', imageId: 'img-2', inputTopics: [] },
        ],
    } as unknown as PipelineModel;

    const open = (pipe: PipelineModel = pipeline) => {
        TestBed.overrideProvider(PipelineRegistryService, { useValue: { getPipeline: () => of(structuredClone(pipe)) } });
        fixture = TestBed.createComponent(PipelineDetailsComponent);
        fixture.detectChanges();
        fixture.detectChanges();
        page = fixture.nativeElement;
    };

    beforeEach(() => {
        updateRight = true;
        TestBed.configureTestingModule({
            imports: [PipelineDetailsComponent],
            providers: [
                provideRouter([{ path: 'data/pipelines/edit/:id', children: [] }]),
                { provide: FlowEngineService, useValue: { userHasUpdateAuthorization: () => updateRight } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'pipe-1' } } } },
                { provide: PipelineRegistryService, useValue: { getPipeline: () => of(structuredClone(pipeline)) } },
                { provide: DeviceTypeService, useValue: { getDeviceService: (id: string) => of({ name: 'Service of ' + id }) } },
                {
                    provide: DeviceInstancesService,
                    useValue: {
                        getDeviceInstance: (id: string) => of(id === 'dev-1' ? { display_name: 'Device One', name: 'x' } : id === 'dev-2' ? { name: 'Device Two' } : null),
                    },
                },
            ],
        });
    });

    /** Everything from the first operator on, without the Show All label that moves with the layout. */
    const operatorTexts = () => {
        const all = texts(page).filter((t) => t !== 'Show All');
        return all.slice(all.indexOf('Averager - op-1 - img-1'));
    };

    it('shows name, description, ids and the flow link', () => {
        open();
        const text = texts(page).join(' | ');

        expect(text).toContain('a pipeline');
        expect(text).toContain('what it does');
        expect(text).toContain('pipe-1');
        const flowLink = Array.from(page.querySelectorAll('a')).find((a) => a.textContent?.trim() === 'flow-1');
        expect(flowLink?.getAttribute('href')).toBe('/data/designer/flow-1');
    });

    it('lists operators with their config and the inputs that are shown by default', () => {
        open();
        expect(operatorTexts()).toEqual([
            'Averager - op-1 - img-1',
            'window: 5',
            'unit: min',
            'Service of urn:infai:ses:service:1',
            'Device One',
            'Device Two',
            'dev-3',
            'value.level --> level',
            'upstream',
            'Pipeline: p2, Operator: o1',
            'a --> b',
            'Second - op-2 - img-2',
        ]);
    });

    it('shows the inputs without a pipeline reference once Show All is on', () => {
        open();
        fixture.componentInstance.showAll = true;
        fixture.detectChanges();

        expect(operatorTexts()).toContain('hidden topic');
        expect(operatorTexts()).toContain('plain');
    });

    describe('header', () => {
        const withSelection = (selections: unknown[] | undefined) =>
            ({ ...pipeline, operators: [{ ...pipeline.operators[1], inputSelections: selections }] }) as unknown as PipelineModel;
        const action = (label: string) =>
            Array.from(page.querySelectorAll<HTMLElement>('senergy-page-header .page-actions a, senergy-page-header .page-actions button'))
                .find((el) => el.textContent?.includes(label));

        it('titles the page with the pipeline name and links back to the pipeline list', () => {
            open();

            expect(page.querySelector('.page-title')?.textContent).toBe('a pipeline');
            const back = page.querySelector('.page-back') as HTMLAnchorElement;
            expect(back.getAttribute('href')).toBe('/data/pipelines');
            expect(back.textContent).toContain('Pipelines');
        });

        it('offers Edit and Open in designer for an editable pipeline with the update right', async () => {
            open(withSelection([{ inputName: 'value' }]));

            action('Edit')?.click();
            await fixture.whenStable();
            expect(TestBed.inject(Router).url).toBe('/data/pipelines/edit/pipe-1');
        });

        it('links Open in designer to the flow of the pipeline', () => {
            open();

            expect(action('Open in designer')?.getAttribute('href')).toBe('/data/designer/flow-1');
        });

        it('offers no Edit without the update right, but still the designer link', () => {
            updateRight = false;
            open(withSelection([{ inputName: 'value' }]));

            expect(action('Edit')).toBeUndefined();
            expect(action('Open in designer')).toBeDefined();
        });

        it('offers no Edit for a legacy pipeline without input selections', () => {
            open(withSelection(undefined));

            expect(action('Edit')).toBeUndefined();
            expect(action('Open in designer')).toBeDefined();
        });

        it('offers no Edit when the input selections are empty', () => {
            open(withSelection([]));

            expect(action('Edit')).toBeUndefined();
        });
    });

    describe('image sizing', () => {
        const withImage = (viewBox: string) =>
            ({ ...pipeline, image: '<svg xmlns="http://www.w3.org/2000/svg" ' + viewBox + ' width="100%" height="100%"><rect width="5" height="5"/></svg>' }) as unknown as PipelineModel;
        const imageHeight = () => decodeSvgDataUrl((page.querySelector('.widget-image img') as HTMLImageElement).src).documentElement.getAttribute('height');

        it('sizes an image written with the camel-case viewBox like one with the lowercase attribute', () => {
            open(withImage('viewBox="0 0 200 80"'));

            expect(page.querySelector('.page-title')?.textContent).toBe('a pipeline');
            expect(imageHeight()).toBe('80');
        });

        it('shows the page and the image at its own height when there is no viewBox at all', () => {
            open(withImage(''));

            expect(page.querySelector('.page-title')?.textContent).toBe('a pipeline');
            expect(operatorTexts()).toContain('Averager - op-1 - img-1');
            expect(imageHeight()).toBe('100%');
        });
    });
});
