/*
 * Copyright 2025 InfAI (CC SES)
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

import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { FloorplanEditDialogComponent } from './floorplan-edit-dialog/floorplan-edit-dialog.component';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { map, Observable, Subscription } from 'rxjs';
import { dotSize, draw } from './shared/floorplan.model';
import { DeviceCommandModel, DeviceCommandResponseModel, DeviceCommandService } from 'src/app/core/services/device-command.service';

@Component({
  selector: 'senergy-floorplan',
  templateUrl: './floorplan.component.html',
  styleUrl: './floorplan.component.css'
})
export class FloorplanComponent implements OnInit, OnDestroy {
  @Input() dashboardId = '';
  @Input() widget: WidgetModel = {} as WidgetModel;
  @Input() zoom = false;
  @Input() userHasDeleteAuthorization = false;
  @Input() userHasUpdatePropertiesAuthorization = false;
  @Input() userHasUpdateNameAuthorization = false;

  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  ready = true;
  refreshing = false;
  destroy: Subscription | undefined;
  dotSize = dotSize;
  values: DeviceCommandResponseModel[] = [];

  constructor(
    private dialog: MatDialog,
    private dashboardService: DashboardService,
    private deviceCommandService: DeviceCommandService,
  ) { }

  ngOnInit(): void {
    this.refresh().subscribe(_ => this.ready = true);
    this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
      if (event === 'reloadAll' || event === this.widget.id) {
        this.refresh().subscribe();
      }
    });
  }
  ngOnDestroy(): void {
    this.destroy?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize() {
    this.draw();
  }

  draw() {
    draw(this.canvas.nativeElement, this.widget.properties, this.values.map(r => {
      return { text: '' + r.message };
    }));
  }

  private refresh(): Observable<unknown> {
    this.refreshing = true;
    const commands: DeviceCommandModel[] = [];
    this.widget.properties.floorplan?.placements.forEach(p => commands.push({
      group_id: p.deviceGroupId || undefined,
      function_id: p.criteria.function_id,
      aspect_id: p.criteria.aspect_id,
      device_class_id: p.criteria.device_class_id,
      // TODO add input if controlling & required
    }));
    return this.deviceCommandService.runCommands(commands, true).pipe(map(res => {
      this.values = res;
      this.draw();
      this.refreshing = false;
    }));
  }

  edit() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.minWidth = '75vw';
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      widgetId: this.widget.id,
      dashboardId: this.dashboardId,
      userHasUpdateNameAuthorization: this.userHasUpdateNameAuthorization,
      userHasUpdatePropertiesAuthorization: this.userHasUpdatePropertiesAuthorization,
    };
    const editDialogRef = this.dialog.open(FloorplanEditDialogComponent, dialogConfig);

    editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
      if (widget !== undefined) {
        this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
      }
    });
  }

}
