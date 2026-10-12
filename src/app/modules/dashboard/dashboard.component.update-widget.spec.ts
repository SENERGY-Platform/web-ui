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
import { By } from '@angular/platform-browser';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './shared/dashboard.service';
import { DashboardModel } from './shared/dashboard.model';
import { DashboardManipulationEnum } from './shared/dashboard-manipulation.enum';
import { DashboardTypesEnum } from './shared/dashboard-types.enum';
import { WidgetModel } from './shared/dashboard-widget.model';
import { CoreModule } from '../../core/core.module';
import { ResponsiveService } from '../../core/services/responsive.service';
import { DeviceStatusService } from '../../widgets/device-status/shared/device-status.service';
import { WidgetComponent } from '../../widgets/widget.component';

describe('DashboardComponent updating a widget', () => {
    let fixture: ComponentFixture<DashboardComponent>;
    let component: DashboardComponent;
    let dashboardServiceSpy: Spy<DashboardService>;

    const widgetsOf = () => component.dashboards[0].widgets;

    function update(widgetId: string, widget: WidgetModel | null) {
        dashboardServiceSpy.dashboardWidgetObservable.nextWith({ manipulation: DashboardManipulationEnum.Update, widgetId, widget, reloadAfterZoom: true, initialWidgetData: null });
    }

    function edited(widget: WidgetModel, name: string, properties: object): WidgetModel {
        return { ...widget, name, properties: properties as WidgetModel['properties'] };
    }

    /** The widget objects the rendered widget components hold, by widget id. */
    function renderedWidgets(): Map<string, WidgetModel> {
        const result = new Map<string, WidgetModel>();
        fixture.debugElement.queryAll(By.directive(WidgetComponent)).forEach(d => {
            const widget = (d.componentInstance as WidgetComponent).widget;
            result.set(widget.id, widget);
        });
        return result;
    }

    beforeEach(async () => {
        const responsiveServiceSpy = createSpyFromClass<ResponsiveService>(ResponsiveService);
        responsiveServiceSpy.observeMqAlias.and.nextOneTimeWith('md');
        dashboardServiceSpy = createSpyFromClass<DashboardService>(DashboardService, {
            observablePropsToSpyOn: ['dashboardObservable', 'dashboardWidgetObservable'],
        });
        dashboardServiceSpy.updateWidgetPosition.and.returnValue(of({ message: 'ok' }));
        dashboardServiceSpy.getDashboards.and.nextOneTimeWith([
            {
                id: 'dashboard-1',
                name: 'first',
                widgets: [
                    { id: 'widget-1', name: 'one', type: 'single_value', properties: { a: 1 }, x: 0, y: 0, w: 2, h: 3 },
                    { id: 'widget-2', name: 'two', type: 'switch', properties: { b: 1 }, x: 2, y: 0, w: 1, h: 1 },
                ],
            },
        ] as unknown as DashboardModel[]);

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, MatSnackBarModule, MatDialogModule, MatIconModule, MatMenuModule, MatTabsModule, MatDividerModule, MatButtonModule, NoopAnimationsModule, DashboardComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: DashboardService, useValue: dashboardServiceSpy },
                { provide: ResponsiveService, useValue: responsiveServiceSpy },
                { provide: DeviceStatusService, useValue: createSpyFromClass(DeviceStatusService) },
            ],
        })
            // the widget types are not under test, only which object the dashboard hands them
            .overrideComponent(WidgetComponent, { set: { template: '', imports: [] } })
            .compileComponents();
        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    Object.values(DashboardTypesEnum).forEach(type => {
        it('takes the name and properties of an edited ' + type + ' widget and keeps its position', () => {
            widgetsOf()[0].type = type;
            update('widget-1', edited(widgetsOf()[0], 'renamed', { a: 2 }));
            expect(widgetsOf()[0].name).toBe('renamed');
            expect(widgetsOf()[0].properties).toEqual({ a: 2 } as never);
            expect(widgetsOf()[0].type).toBe(type);
            expect([widgetsOf()[0].x, widgetsOf()[0].y, widgetsOf()[0].w, widgetsOf()[0].h]).toEqual([0, 0, 2, 3]);
        });
    });

    it('keeps the other widgets and the order', () => {
        const other = widgetsOf()[1];
        update('widget-1', edited(widgetsOf()[0], 'renamed', { a: 2 }));
        expect(widgetsOf().map(w => w.id)).toEqual(['widget-1', 'widget-2']);
        expect(widgetsOf()[1]).toBe(other);
    });

    it('ignores an edit of a widget that is not on the dashboard', () => {
        update('widget-9', { id: 'widget-9', name: 'x', type: 'switch', properties: {} } as WidgetModel);
        expect(widgetsOf().map(w => w.name)).toEqual(['one', 'two']);
    });

    it('asks the widget to load again, also for an edit that changed nothing', async () => {
        update('widget-1', widgetsOf()[0]);
        await new Promise(resolve => setTimeout(resolve));
        expect(dashboardServiceSpy.initWidget).toHaveBeenCalledWith('widget-1');
    });

    it('replaces the widget object, so a widget that compares its input sees a new reference', () => {
        const before = widgetsOf()[0];
        update('widget-1', edited(before, 'renamed', { a: 2 }));
        expect(widgetsOf()[0]).not.toBe(before);
        expect(before.name).withContext('the replaced object is left as it was').toBe('one');
    });

    it('replaces the widget object also when the widget is sent back unchanged', () => {
        const before = widgetsOf()[0];
        update('widget-1', before);
        expect(widgetsOf()[0]).not.toBe(before);
        expect(widgetsOf()[0]).toEqual(before);
    });

    it('hands the rendered widget the edited object and keeps its grid item element', () => {
        const element = fixture.nativeElement.querySelector('#gridstack-item-widget-1');
        expect(element).not.toBeNull();
        expect(renderedWidgets().get('widget-1')).toBe(widgetsOf()[0]);
        update('widget-1', edited(widgetsOf()[0], 'renamed', { a: 2 }));
        expect(renderedWidgets().get('widget-1')).toBe(widgetsOf()[0]);
        expect(renderedWidgets().get('widget-1')?.name).toBe('renamed');
        expect(fixture.nativeElement.querySelector('#gridstack-item-widget-1')).toBe(element);
    });

    it('hands the maximized widget the edited object', () => {
        dashboardServiceSpy.dashboardWidgetObservable.nextWith({ manipulation: DashboardManipulationEnum.Zoom, widgetId: 'widget-2', widget: widgetsOf()[1], reloadAfterZoom: true, initialWidgetData: null });
        expect(component.zoomedWidgetIndex).toBe(1);
        expect(renderedWidgets().get('widget-2')).toBe(widgetsOf()[1]);
        update('widget-2', edited(widgetsOf()[1], 'renamed', { b: 2 }));
        expect(component.zoomedWidgetIndex).toBe(1);
        expect(renderedWidgets().get('widget-2')).toBe(widgetsOf()[1]);
        expect(renderedWidgets().get('widget-2')?.properties).toEqual({ b: 2 } as never);
    });

    it('maximizes the widget the header sends back after an edit', () => {
        update('widget-2', edited(widgetsOf()[1], 'renamed', { b: 2 }));
        const rendered = renderedWidgets().get('widget-2') as WidgetModel;
        dashboardServiceSpy.dashboardWidgetObservable.nextWith({ manipulation: DashboardManipulationEnum.Zoom, widgetId: 'widget-2', widget: rendered, reloadAfterZoom: true, initialWidgetData: null });
        expect(component.zoomedWidgetIndex).toBe(1);
    });

    describe('a position save that fails after the edit', () => {
        /** The grid reports widget-1 moved to x = 5; the real grid would put it back on the next render. */
        function dragWidgetOne() {
            component.grid = { engine: { nodes: [{ el: { id: 'gridstack-item-widget-1' }, x: 5, y: 0, w: 2, h: 3 }] } } as never;
        }

        it('puts the previous position back on the edited widget', () => {
            const response = new Subject<null>();
            dashboardServiceSpy.updateWidgetPosition.and.returnValue(response.asObservable() as never);
            dragWidgetOne();
            component.saveWidgetPositions();
            expect(widgetsOf()[0].x).toBe(5);
            update('widget-1', edited(widgetsOf()[0], 'renamed', { a: 2 }));
            response.next(null);
            expect(widgetsOf()[0].x).toBe(0);
            expect(widgetsOf()[0].name).toBe('renamed');
        });
    });
});
