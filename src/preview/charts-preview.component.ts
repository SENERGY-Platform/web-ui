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

/* Preview harness - local only. Shows one chart widget per route, e.g. /charts/export-line, in a dashboard-sized box. */
import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { WidgetModel } from '../app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from '../app/modules/dashboard/shared/dashboard.service';
import { AnomalyReconstructionComponent } from '../app/widgets/anomaly/reconstruction/reconstruction.component';
import { previewCharts, previewReconstruction } from './chart-fixtures';
import { WidgetComponent } from '../app/widgets/widget.component';

@Component({
    selector: 'senergy-charts-preview',
    template: `
      <div style="padding:16px">
        @if (widget) {
          <div class="preview-widget" [style.width.px]="zoom ? 1200 : 640" [style.height.px]="zoom ? 720 : 420">
            <senergy-widget [widget]="widget" [zoom]="zoom" dashboardId="preview" [userHasDeleteAuthorization]="true"
              [userHasUpdatePropertiesAuthorization]="true" [userHasUpdateNameAuthorization]="true" style="display:block;height:100%"></senergy-widget>
          </div>
        }
      </div>`,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [WidgetComponent]
})
export class ChartsPreviewComponent implements OnInit, AfterViewInit {
    private route = inject(ActivatedRoute);
    private dashboardService = inject(DashboardService);
    private dialog = inject(MatDialog);

    widget?: WidgetModel;
    zoom = false;

    ngOnInit(): void {
        const name = this.route.snapshot.paramMap.get('name') || '';
        if (name === 'anomaly-reconstruction') {
            this.dialog.open(AnomalyReconstructionComponent, { minWidth: '1000px', minHeight: '500px', data: { anomaly: previewReconstruction } });
            return;
        }
        this.widget = previewCharts[name]?.widget;
        this.zoom = previewCharts[name]?.zoom || false;
    }

    ngAfterViewInit(): void {
        // the dashboard starts its widgets once the grid animation is done
        setTimeout(() => this.dashboardService.reloadAllWidgets(), 100);
    }
}
