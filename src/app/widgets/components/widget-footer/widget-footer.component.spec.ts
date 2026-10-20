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
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { WidgetFooterComponent } from './widget-footer.component';
import { WidgetFooterService } from './shared/widget-footer.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';

describe('WidgetFooterComponent actions menu', () => {
    let fixture: ComponentFixture<WidgetFooterComponent>;
    let dashboardService: jasmine.SpyObj<DashboardService>;
    let footerService: jasmine.SpyObj<WidgetFooterService>;
    let overlay: HTMLElement;
    const widget = { id: 'w1' } as WidgetModel;

    beforeEach(() => {
        dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['manipulateWidget', 'zoomWidget']);
        footerService = jasmine.createSpyObj<WidgetFooterService>('WidgetFooterService', ['openDeleteWidgetDialog']);
        TestBed.configureTestingModule({
            imports: [WidgetFooterComponent, NoopAnimationsModule],
            providers: [
                { provide: DashboardService, useValue: dashboardService },
                { provide: WidgetFooterService, useValue: footerService },
            ],
        });
        fixture = TestBed.createComponent(WidgetFooterComponent);
        fixture.componentRef.setInput('widget', widget);
        fixture.componentRef.setInput('dashboardId', 'd1');
        overlay = TestBed.inject(OverlayContainer).getContainerElement();
    });

    afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

    const open = () => {
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('.widget-menu-trigger') as HTMLButtonElement).click();
        fixture.detectChanges();
    };
    const items = () => Array.from(overlay.querySelectorAll('button[mat-menu-item]')) as HTMLButtonElement[];
    const labels = () => items().map((item) => item.textContent?.replace(/\s+/g, ' ').trim());

    it('lists Refresh, Maximise, Edit and Delete in that order with every right', () => {
        fixture.componentRef.setInput('optionZoom', true);
        fixture.componentRef.setInput('widgetHasUpdateableProperties', true);
        fixture.componentRef.setInput('userHasUpdatePropertiesAuthorization', true);
        fixture.componentRef.setInput('userHasDeleteAuthorization', true);
        open();

        expect(labels()).toEqual(['refresh Refresh', 'zoom_out_map Maximise', 'edit Edit', 'delete Delete']);
        expect(items()[3].classList).toContain('danger');
    });

    it('keeps hiding the actions the widget or the user does not have', () => {
        open();

        expect(labels()).toEqual(['refresh Refresh']);
    });

    it('refreshes the widget', () => {
        open();
        items()[0].click();

        expect(dashboardService.manipulateWidget).toHaveBeenCalledWith(DashboardManipulationEnum.Update, 'w1', widget);
    });

    it('maximises the widget', () => {
        fixture.componentRef.setInput('optionZoom', true);
        open();
        items()[1].click();

        expect(dashboardService.zoomWidget).toHaveBeenCalled();
    });

    it('emits edit', () => {
        fixture.componentRef.setInput('userHasUpdateNameAuthorization', true);
        const edited = jasmine.createSpy('edited');
        fixture.componentInstance.editEvent.subscribe(edited);
        open();
        items()[1].click();

        expect(edited).toHaveBeenCalledWith(true);
    });

    it('opens the delete dialog', () => {
        fixture.componentRef.setInput('userHasDeleteAuthorization', true);
        open();
        items()[1].click();

        expect(footerService.openDeleteWidgetDialog).toHaveBeenCalledWith('d1', 'w1');
    });

    it('shows no menu while the widget is maximised', () => {
        fixture.componentRef.setInput('zoom', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.widget-menu-trigger')).toBeNull();
    });

    it('keeps the widget-specific buttons in a row of their own', () => {
        fixture.componentRef.setInput('optionAdd', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('mat-card-actions')).not.toBeNull();
    });

    it('renders no row when there is no widget-specific button', () => {
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('mat-card-actions')).toBeNull();
    });
});
