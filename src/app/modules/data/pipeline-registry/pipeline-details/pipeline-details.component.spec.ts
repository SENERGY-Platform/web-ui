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
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PipelineDetailsComponent } from './pipeline-details.component';
import { PipelineRegistryService } from '../shared/pipeline-registry.service';
import { PipelineModel } from '../shared/pipeline.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
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
                { provide: Location, useValue: {} },
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
