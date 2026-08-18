/*
 *
 *     Copyright 2026 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { SingleServiceDocComponent } from './single-service-doc.component';
import { SwaggerService } from '../shared/swagger/swagger.service';
import { SwaggerModel } from '../shared/swagger/swagger.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { AuthorizationServiceMock } from '../../../core/services/authorization.service.mock';

// Waits until the selector matches: swagger-ui renders through React outside
// of Angular's zone, so whenStable() cannot see when the DOM is complete.
const waitForElement = async (root: HTMLElement, selector: string): Promise<Element | null> => {
    const deadline = Date.now() + 8000;
    let element = root.querySelector(selector);
    while (!element && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        element = root.querySelector(selector);
    }
    return element;
};

describe('SingleServiceDocComponent', () => {
    const testSpec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0', description: '' },
        paths: { '/things': { get: { summary: 'List things', responses: { 200: { description: 'ok' } } } } },
    } as SwaggerModel;

    let specResponse: SwaggerModel | null;
    let fixture: ComponentFixture<SingleServiceDocComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                declarations: [SingleServiceDocComponent],
                imports: [CommonModule],
                providers: [
                    { provide: ActivatedRoute, useValue: { params: of({ type: 'openapi', id: 'test-service' }) } },
                    { provide: SwaggerService, useValue: { getSingleSwagger: () => of(specResponse) } },
                    { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                ],
            });
        }),
    );

    it('renders the openapi documentation of the requested service', async () => {
        specResponse = testSpec;
        fixture = TestBed.createComponent(SingleServiceDocComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const title = await waitForElement(fixture.nativeElement, '#swagger .swagger-ui .info .title');
        expect(title).withContext('swagger-ui did not render the api documentation').not.toBeNull();
        expect(title?.textContent).toContain('Test API');
    }, 15000);

    it('stays in the loading state when the service has no spec for the id', async () => {
        specResponse = null;
        fixture = TestBed.createComponent(SingleServiceDocComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(fixture.componentInstance.ready).toBeFalse();
        expect(fixture.nativeElement.querySelector('#swagger')?.children.length).toBe(0);
    });
});
