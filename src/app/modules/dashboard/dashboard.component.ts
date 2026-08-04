/*
 * Copyright 2020 InfAI (CC SES)
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

import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DashboardService } from './shared/dashboard.service';
import { DashboardModel } from './shared/dashboard.model';
import { WidgetModel, WidgetUpdatePosition } from './shared/dashboard-widget.model';
import { DashboardWidgetManipulationModel } from './shared/dashboard-widget-manipulation.model';
import { DashboardManipulationEnum } from './shared/dashboard-manipulation.enum';
import { DashboardManipulationModel } from './shared/dashboard-manipulation.model';
import { catchError, forkJoin, Observable, of, Subscription, tap } from 'rxjs';
import { DashboardTypesEnum, dashboardTypesEnumFromString, resizable } from './shared/dashboard-types.enum';
import { DeviceStatusService } from '../../widgets/device-status/shared/device-status.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { DialogsService } from '../../core/services/dialogs.service';
import { ProcessSchedulerService } from '../../widgets/process-scheduler/shared/process-scheduler.service';
import { DataTableService } from '../../widgets/data-table/shared/data-table.service';
import { AirQualityService } from '../../widgets/air-quality/shared/air-quality.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabGroup } from '@angular/material/tabs';
import { ChartsService } from '../../widgets/charts/shared/charts.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { elementCB, GridstackComponent } from 'gridstack/dist/angular';
import { GridStack, GridStackOptions, Responsive } from 'gridstack';
import {
    AUTO_COLUMNS,
    COLUMN_BANDS,
    DEFAULT_LAYOUT_MODE,
    LAYOUT_MODES,
    LayoutMode,
    MAX_COLUMNS,
    MIN_COLUMNS,
    MIN_UNIT_PX,
} from './shared/dashboard.model';

@Component({
    selector: 'senergy-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
    dashboards: DashboardModel[] = [];
    dashboardsRetrieved = false;
    activeTabIndex = 0;
    interval = 0;
    zoomedWidgetIndex: number | null = null;
    dashWidgetSubscription = new Subscription();
    dashSubscription = new Subscription();
    inDragMode = false;
    dragModeDisabled = false;
    dragging = false;
    mouseHoverHeaderIndex = -1;
    @ViewChild(MatTabGroup, { static: false }) matTabGroup!: MatTabGroup;

    // Authorization
    userHasUpdateDashboardAuthorization = false;
    userHasDeleteDashboardAuthorization = false;
    userHasCreateDashboardAuthorization = false;
    userHasUpdateWidgetPropertiesAuthorization = false;
    userHasDeleteWidgetAuthorization = false;
    userHasCreateWidgetAuthorization = false;
    userHasMoveWidgetAuthorization = false;
    userHasUpdateWidgetNameAuthorization = false;

    initialWidgetData: any;

    grid: GridStack | undefined;
    @ViewChild(GridstackComponent)
    set gridstackComponent(component: GridstackComponent | undefined) {
        if (component === undefined) {
            // the tab's grid has been torn down - dropping it keeps anything that still reaches for
            // this.grid from calling a destroyed instance, whose engine and element are already gone
            this.grid = undefined;
        } else {
            this.grid = GridStack.init(undefined, component.el);
            // the grid derives its column count from the bands as it is built, but that happens while it
            // is still empty - before its own items can put a scrollbar on the wrapper and take a few
            // pixels off the width. Re-measuring settles the count when those pixels cross a band edge,
            // rather than leaving it to the resize observer a moment later.
            this.grid?.onResize();
            this.applyRepack();
            // deliberately not saved: re-packing on load is a rendering decision, and writing it back
            // makes every dashboard rewrite its coordinates just by being opened
        }
    }
    resizable = resizable;
    dashboardTypesEnumFromString = dashboardTypesEnumFromString;

    /**
     * Options bound to the grid, as a stored object rather than a template literal: the wrapper hands
     * every new object to GridStack.updateOptions(), so a literal would reconfigure the grid on every
     * change detection pass, including mid-drag.
     */
    gridOptions: GridStackOptions = {};
    readonly layoutModes = LAYOUT_MODES;
    /** Width the grid is held to, so no column falls below MIN_UNIT_PX - the wrapper scrolls instead. */
    gridMinWidth = MIN_UNIT_PX;
    readonly columnChoices = Array.from(
        { length: MAX_COLUMNS - MIN_COLUMNS + 1 },
        (_unused, index) => MIN_COLUMNS + index,
    );

    constructor(
        private dashboardService: DashboardService,
        private dialogsService: DialogsService,
        private processSchedulerService: ProcessSchedulerService,
        private dataTableService: DataTableService,
        private airQualityService: AirQualityService,
        private deviceStatusService: DeviceStatusService,
        private chartsService: ChartsService,
        private route: ActivatedRoute,
        private router: Router,
        private errorHandlerService: ErrorHandlerService,
        private cd: ChangeDetectorRef,
    ) { }

    ngOnInit() {
        this.initDashboard();
        this.initWidgets();
        this.checkAuthorization();
    }

    ngOnDestroy(): void {
        this.dashWidgetSubscription.unsubscribe();
        this.dashSubscription.unsubscribe();
        clearInterval(this.interval);
    }

    checkAuthorization() {
        this.userHasUpdateDashboardAuthorization = this.dashboardService.userHasUpdateDashboardAuthorization();
        this.userHasDeleteDashboardAuthorization = this.dashboardService.userHasDeleteDashboardAuthorization();
        this.userHasCreateDashboardAuthorization = this.dashboardService.userHasCreateDashboardAuthorization();

        this.userHasUpdateWidgetPropertiesAuthorization = this.dashboardService.userHasUpdateWidgetPropertiesAuthorization();
        this.userHasUpdateWidgetNameAuthorization = this.dashboardService.userHasUpdateWidgetNameAuthorization();

        this.userHasDeleteWidgetAuthorization = this.dashboardService.userHasDeleteWidgetAuthorization();
        this.userHasCreateWidgetAuthorization = this.dashboardService.userHasCreateWidgetAuthorization();
        this.userHasMoveWidgetAuthorization = this.dashboardService.userHasMoveWidgetAuthorization();
        // disableResize comes from the authorization above
        this.refreshGridOptions();
    }

    initAllWidgets() {
        this.dashboardService.reloadAllWidgets();
        this.refreshAllWidgets();
    }

    refreshAllWidgets() {
        clearInterval(this.interval);
        const refreshTimeInMs = this.dashboards[this.activeTabIndex]?.refresh_time * 1000;
        if (refreshTimeInMs > 0) {
            this.interval = window.setInterval(() => this.dashboardService.reloadAllWidgets(), refreshTimeInMs);
        }
    }

    openAddDashboardDialog() {
        this.dashboardService.openNewDashboardDialog(this.dashboards.length);
    }

    openDeleteDashboardDialog() {
        this.dashboardService.openDeleteDashboardDialog(this.dashboards[this.activeTabIndex].id);
    }

    openEditDashboardDialog() {
        this.dashboardService.openEditDashboardDialog(this.dashboards[this.activeTabIndex]);
    }

    openAddWidgetDialog() {
        this.dashboardService.openNewWidgetDialog(this.dashboards[this.activeTabIndex].id);
    }

    setTabIndex(index: number): void {
        this.zoomedWidgetIndex = null;
        if (this.activeTabIndex !== index) {
            this.activeTabIndex = index;
            this.navigate();
        }
        // the layout mode belongs to the dashboard, so the grid is reconfigured per tab
        this.refreshGridOptions();
    }

    refreshTime(time: number): void {
        const dashboard = this.dashboards[this.activeTabIndex];
        dashboard.refresh_time = time;
        this.persistDashboard(dashboard).subscribe(() => this.refreshAllWidgets());
    }

    toggleDragMode() {
        this.inDragMode = !this.inDragMode;
        // disableDrag follows this, so the grid has to be told
        this.refreshGridOptions();
    }

    /**
     * Swaps dashboard position with left or right neighbor and updates indices of both dashboards
     *
     * @param moveLeft true -> swap with left neighbor, false -> swap with right neighbor
     */
    moveDashboard(moveLeft: boolean) {
        const newIndex = moveLeft ? this.activeTabIndex - 1 : this.activeTabIndex + 1;
        if (newIndex < 0 || newIndex > this.dashboards.length - 1) {
            console.error('Cant move dashboard to position ' + newIndex);
            return;
        }
        const observables: Observable<DashboardModel>[] = [];
        let dashboard = this.dashboards[this.activeTabIndex];
        dashboard.index = newIndex;
        observables.push(this.dashboardService.updateDashboard(dashboard));
        dashboard = this.dashboards[newIndex];
        dashboard.index = this.activeTabIndex;
        observables.push(this.dashboardService.updateDashboard(dashboard));
        forkJoin(observables).subscribe(() => {
            moveItemInArray(this.dashboards, this.activeTabIndex, newIndex);
            this.setTabIndex(newIndex);
        });
    }

    /** The active dashboard's layout mode. Absent or unrecognised reads as the default. */
    layoutMode(): LayoutMode {
        const stored = this.dashboards[this.activeTabIndex]?.layout_mode;
        return LAYOUT_MODES.some((option) => option.mode === stored) ? (stored as LayoutMode) : DEFAULT_LAYOUT_MODE;
    }

    /**
     * Stores the chosen layout mode on the dashboard. 'compact' and 'list' re-pack straight away; the
     * other four only describe what a column change does to the widgets, so they take effect the next
     * time the count actually changes.
     */
    selectLayoutMode(mode: LayoutMode) {
        const dashboard = this.dashboards[this.activeTabIndex];
        if (dashboard === undefined || mode === this.layoutMode()) {
            return;
        }
        dashboard.layout_mode = mode;
        this.refreshGridOptions();
        this.applyColumnCount();
        this.applyRepack();
        this.persistDashboard(dashboard).subscribe();
    }

    /** Columns the active dashboard is pinned to, or AUTO_COLUMNS while the count follows the width. */
    fixedColumns(): number {
        const stored = this.dashboards[this.activeTabIndex]?.columns;
        return stored !== undefined && stored >= MIN_COLUMNS && stored <= MAX_COLUMNS ? stored : AUTO_COLUMNS;
    }

    isAutoColumns(): boolean {
        return this.fixedColumns() === AUTO_COLUMNS;
    }

    /**
     * Pins the active dashboard to a column count, or hands the count back to the window width when
     * given AUTO_COLUMNS or anything out of range - which is what the menu's Auto entry sends.
     */
    selectColumns(columns: number) {
        const dashboard = this.dashboards[this.activeTabIndex];
        const wanted = columns >= MIN_COLUMNS && columns <= MAX_COLUMNS ? columns : AUTO_COLUMNS;
        if (dashboard === undefined || wanted === this.fixedColumns()) {
            return;
        }
        dashboard.columns = wanted;
        this.refreshGridOptions();
        this.applyColumnCount();
        this.persistDashboard(dashboard).subscribe();
    }

    /**
     * Brings the live grid onto the chosen column count without waiting for a window resize.
     *
     * This is the only thing that applies a pinned count: updateOptions() treats columnOpts and column
     * as alternatives, so the null columnOpts from refreshGridOptions() makes it skip o.column. Call
     * this whenever the count changes, and keep it after refreshGridOptions() so the grid is reconfigured
     * before the new options object reaches the wrapper.
     */
    private applyColumnCount() {
        const fixed = this.fixedColumns();
        if (fixed === AUTO_COLUMNS) {
            this.grid?.onResize();
        } else {
            this.grid?.column(fixed, this.layoutMode());
        }
    }

    /**
     * Saves the dashboard and takes the fresh updatedAt from the response - the service versions a
     * dashboard by that stamp and refuses a write carrying a stale one, so without this only the first
     * change of a session is accepted.
     */
    private persistDashboard(dashboard: DashboardModel): Observable<DashboardModel> {
        return this.dashboardService.updateDashboard(dashboard).pipe(
            tap((updated) => {
                if (updated?.updatedAt !== undefined) {
                    dashboard.updatedAt = updated.updatedAt;
                }
            }),
        );
    }

    /**
     * Re-packs the grid, in the two modes that do that. gridstack only consults columnOpts.layout on a
     * column change, so 'compact' and 'list' have to be acted on here to be visible at all - while
     * compacting for the other four would rearrange the layout the user chose to keep.
     */
    applyRepack() {
        const mode = this.layoutMode();
        if (mode === 'compact' || mode === 'list') {
            this.grid?.compact(mode);
        }
    }

    /** Rebuilds the grid options for the active dashboard. */
    private refreshGridOptions() {
        const fixed = this.fixedColumns();
        const options: GridStackOptions = {
            margin: 5,
            handleClass: 'drag-handler',
            disableDrag: !this.inDragMode,
            disableResize: !this.userHasMoveWidgetAuthorization,
        };
        if (fixed === AUTO_COLUMNS) {
            // the bands already hold every column above the floor, so this only bites on a viewport
            // narrower than a single unit
            this.gridMinWidth = MIN_UNIT_PX;
            options.columnOpts = {
                breakpoints: COLUMN_BANDS,
                columnMax: MAX_COLUMNS,
                layout: this.layoutMode(),
            };
        } else {
            // pinned: the count cannot give way, so the width has to - hence the scroll
            this.gridMinWidth = fixed * MIN_UNIT_PX;
            options.column = fixed;
            // null, not undefined: updateOptions() only drops a columnOpts already on a live grid when
            // told null, so undefined would leave a previously auto grid re-deriving its own count
            options.columnOpts = null as unknown as Responsive;
        }
        this.gridOptions = options;
    }

    startDrag() {
        this.dragging = true;
    }

    stopDrag($event: elementCB) {
        this.dragging = false;
        if (this.moveWidgetToDashboardIfNeeded($event.el, $event.event)) {
            // nothing to re-pack here: this grid is on its way out and the destination builds its own,
            // which re-packs from the ViewChild setter. Touching this.grid now would hit the dead one.
            return;
        }
        this.applyRepack();
        this.saveWidgetPositions();
    }

    saveWidgetPositions() {
        const dashboard = this.dashboards[this.activeTabIndex];
        const widgetPositionUpdates: WidgetUpdatePosition[] = [];
        const nodes = this.grid?.engine.nodes;
        if (nodes === undefined) {
            return;
        }
        dashboard.widgets?.forEach(widget => {
            const node = nodes.find(n => n.el?.id === 'gridstack-item-' + widget.id);
            if (node === undefined) {
                return;
            }
            if ((node.x || 0) !== widget.x || (node.y || 0) !== widget.y || node.w !== widget.w || node.h !== widget.h) {
                widget.x = node.x || 0;
                widget.y = node.y || 0;
                widget.w = node.w;
                widget.h = node.h;
                widgetPositionUpdates.push({
                    id: widget.id,
                    x: widget.x,
                    y: widget.y,
                    w: widget.w,
                    h: widget.h,
                    dashboardDestination: dashboard.id,
                    dashboardOrigin: dashboard.id
                });
            }
        });

        if (widgetPositionUpdates.length > 0) {
            this.cd.detectChanges();
            this.dashboardService.updateWidgetPosition(widgetPositionUpdates).pipe(
                catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetPosition', { message: 'error update' }))
            ).subscribe();
        }

    }

    private initDashboard() {
        this.dashboardService.getDashboards().subscribe((dashboards: DashboardModel[]) => {
            this.dashboards = dashboards;
            this.dashboardsRetrieved = true;
            this.route.url.subscribe((url) => {
                const id = url[url.length - 1].toString();
                const idx = this.dashboards.findIndex((d) => d.id === id);
                if (idx === -1) {
                    this.setTabIndex(0);
                } else {
                    this.setTabIndex(idx);
                    const widgetId = this.route.snapshot.queryParams['zoomed_widget'];
                    if (widgetId) {
                        const widgetIndex = this.dashboards[idx].widgets?.findIndex(w => w.id === widgetId);
                        if (widgetIndex !== -1 && widgetIndex !== this.zoomedWidgetIndex) {
                            setTimeout(() => this.zoomWidget({ widgetId, widget: this.dashboards[idx].widgets[widgetIndex], manipulation: DashboardManipulationEnum.Zoom, reloadAfterZoom: true, initialWidgetData: null }), 0);
                        }
                    }
                }
            });
        });

        this.dashSubscription = this.dashboardService.dashboardObservable.subscribe(
            (dashboardManipulationModel: DashboardManipulationModel) => {
                switch (dashboardManipulationModel.manipulation) {
                    case DashboardManipulationEnum.Create: {
                        this.addDashboard(dashboardManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Delete: {
                        this.deleteDashboard(dashboardManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Update: {
                        this.updateDashboard(dashboardManipulationModel);
                        break;
                    }
                }
            },
        );
    }

    private deleteDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        const deletionIndex = this.dashboards.findIndex((dashboard) => dashboard.id === dashboardManipulationModel.dashboardId);
        if (deletionIndex !== -1) {
            if (this.activeTabIndex > this.dashboards.length - 2) {
                this.activeTabIndex = this.dashboards.length - 2;
            }
            if (this.dashboards[deletionIndex].widgets !== undefined) {
                this.dashboards[deletionIndex].widgets.forEach((widget) => this.cleanUp(widget));
            }
            const oldIndex = this.dashboards[deletionIndex].index;
            this.dashboards.splice(deletionIndex, 1);
            this.dashboards.forEach((dashboard: DashboardModel) => {
                if (dashboard.index > oldIndex) {
                    dashboard.index--;
                    // No update to backend needed, logic handled in backend too
                }
            });
        }
    }

    private addDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        this.dashboards.push(dashboardManipulationModel.dashboard || ({} as DashboardModel));
        this.activeTabIndex = this.dashboards.length - 1;
    }

    private updateDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        let dashIndex = -1;
        this.dashboards.forEach((dashboard: DashboardModel, index: number) => {
            if (dashboard.id === dashboardManipulationModel.dashboardId) {
                dashIndex = index;
            }
        });
        if (dashIndex > -1) {
            this.dashboards[dashIndex] = dashboardManipulationModel.dashboard || ({} as DashboardModel);
        }
    }

    private initWidgets() {
        this.dashWidgetSubscription = this.dashboardService.dashboardWidgetObservable.subscribe(
            (widgetManipulationModel: DashboardWidgetManipulationModel) => {
                switch (widgetManipulationModel.manipulation) {
                    case DashboardManipulationEnum.Create: {
                        this.addWidget(widgetManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Delete: {
                        this.deleteWidget(widgetManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Update: {
                        this.updateWidget(widgetManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Zoom: {
                        this.zoomWidget(widgetManipulationModel);
                        break;
                    }
                }
                this.cd.detectChanges();
                this.saveWidgetPositions();
            },
        );
    }

    private updateWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        const i = this.dashboards[this.activeTabIndex].widgets.findIndex(w => w.id === widgetManipulationModel.widgetId);
        if (i !== -1 && widgetManipulationModel.widget !== null) {
            const w = this.dashboards[this.activeTabIndex].widgets[i];
            w.name = widgetManipulationModel.widget.name;
            w.properties = widgetManipulationModel.widget.properties;
        }
        this.cd.detectChanges();
        this.refreshWidget(widgetManipulationModel);
    }

    private deleteWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
            if (widget.id === widgetManipulationModel.widgetId) {
                this.cleanUp(widget);
                this.dashboards[this.activeTabIndex].widgets.splice(index, 1);
            }
        });
        this.grid?.removeWidget('gridstack-item-' + widgetManipulationModel.widgetId);
    }

    private cleanUp(widget: WidgetModel): void {
        switch (widget.type) {
            case DashboardTypesEnum.DeviceStatus:
                this.deviceStatusService.deleteElements(widget.properties.elements);
                break;
            case DashboardTypesEnum.ProcessScheduler:
                this.dialogsService
                    .openDeleteDialog('schedules created by the widget ' + widget.name)
                    .afterClosed()
                    .subscribe((yes) => {
                        if (yes === true) {
                            this.processSchedulerService.deleteSchedulesByWidget(widget.id).subscribe(() => null);
                        }
                    });
                break;
            case DashboardTypesEnum.DataTable:
                this.dataTableService.deleteElements(widget.properties.dataTable?.elements);
                break;
            case DashboardTypesEnum.AirQuality:
                this.airQualityService.cleanGeneratedContent(widget.properties);
                break;
            case DashboardTypesEnum.AcControl:
            case DashboardTypesEnum.ChartExport:
                this.chartsService.cleanup(widget);
                break;
        }
    }

    private addWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        if (this.dashboards[this.activeTabIndex].widgets) {
            this.dashboards[this.activeTabIndex].widgets.push(widgetManipulationModel.widget || ({} as WidgetModel));
        } else {
            this.dashboards[this.activeTabIndex].widgets = [widgetManipulationModel.widget || ({} as WidgetModel)];
        }
        this.refreshWidget(widgetManipulationModel);
    }

    private refreshWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        setTimeout(() => this.dashboardService.initWidget(widgetManipulationModel.widgetId), 0);
    }

    private zoomWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        if (this.zoomedWidgetIndex === null && widgetManipulationModel.widget) {
            this.zoomedWidgetIndex = this.dashboards[this.activeTabIndex].widgets.indexOf(widgetManipulationModel.widget);

            if (widgetManipulationModel.reloadAfterZoom === true) {
                setTimeout(() => this.dashboardService.initWidget(widgetManipulationModel.widgetId), 0);
            } else {
                this.initialWidgetData = widgetManipulationModel.initialWidgetData;
            }
        } else {
            this.zoomedWidgetIndex = null;
            setTimeout(() => this.dashboardService.reloadAllWidgets(), 0);
        }
        this.navigate();
    }

    moveWidgetToDashboard(id: string, toIndex: number): Observable<any> {
        if (toIndex < 0 || toIndex > this.dashboards.length - 1) {
            console.error('Invalid index ' + toIndex);
            return of(null);
        }
        if (toIndex === this.activeTabIndex) {
            console.error('Invalid index ' + toIndex + '. Widget already on this dashboard.');
            return of(null);
        }
        if (id.startsWith('gridstack-item-')) {
            id = id.substring('gridstack-item-'.length);
        }
        const index = this.dashboards[this.activeTabIndex].widgets.findIndex((widget) => widget.id === id);
        if (index === -1) {
            console.error('Can\'t find widget with id ' + id + ' on current dashboard');
            return of(null);
        }
        const widgets = this.dashboards[this.activeTabIndex].widgets.splice(index, 1);
        if (widgets.length !== 1) {
            console.error('Unexpected number of widgets spliced');
            return of(null);
        }
        if (this.dashboards[toIndex].widgets === undefined) {
            this.dashboards[toIndex].widgets = [];
        }
        // top left, rather than a row below the lowest widget already there: the grid pushes a colliding
        // widget downwards, so the first free spot from the top is where this lands, and the tab we switch
        // to shows it. Placing it past the last widget put it below the fold on any dashboard with a few
        // widgets on it - far enough that the move looked like it had not happened at all.
        widgets[0].x = 0;
        widgets[0].y = 0;
        const widgetPositionUpdates: WidgetUpdatePosition[] = [{
            id,
            x: widgets[0].x,
            y: widgets[0].y,
            w: widgets[0].w,
            h: widgets[0].h,
            dashboardDestination: this.dashboards[toIndex].id,
            dashboardOrigin: this.dashboards[this.activeTabIndex].id
        }];
        this.dashboards[toIndex].widgets.push(widgets[0]);
        return this.dashboardService.updateWidgetPosition(widgetPositionUpdates).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetPosition', { message: 'error update' }))
        );
    }
    private moveWidgetToDashboardIfNeeded(item: any, $event: any): boolean {
        const headers = this.matTabGroup._elementRef.nativeElement.children[0].children[1].children[0].children[0].children;
        for (let i = 0; i < headers.length - 1; i++) {
            // last index is new dashboard button
            const rect: DOMRect = headers[i].getBoundingClientRect();
            if (
                i !== this.activeTabIndex &&
                $event.clientX < rect.right &&
                $event.clientX > rect.left &&
                $event.clientY > rect.top &&
                $event.clientY < rect.bottom
            ) {
                // deferred out of gridstack's dragstop handler, which is what we are inside: switching
                // tabs tears down the grid that handler belongs to, and gridstack goes on to use its
                // engine and element after we return - both of which destroy() has deleted by then
                setTimeout(() => {
                    this.moveWidgetToDashboard(item.id, i).subscribe();
                    this.setTabIndex(i);
                    this.cd.detectChanges();
                }, 0);
                return true;
            }
        }
        return false;
    }


    mouseEnterHeader(i: number) {
        if (this.activeTabIndex !== i) {
            this.mouseHoverHeaderIndex = i;
        }
    }

    mouseLeaveHeader() {
        this.mouseHoverHeaderIndex = -1;
    }

    private navigate() {
        const url = '/dashboard/' + this.dashboards[this.activeTabIndex].id;
        if (this.zoomedWidgetIndex !== null) {
            this.router.navigate([url], { queryParams: { zoomed_widget: this.dashboards[this.activeTabIndex].widgets[this.zoomedWidgetIndex].id } });
        } else {
            this.router.navigateByUrl(url);
        }
    }

    trackById(_: number, x: { id: string }): string {
        return x.id;
    }
}
