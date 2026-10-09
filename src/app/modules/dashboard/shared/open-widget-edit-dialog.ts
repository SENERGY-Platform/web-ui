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

import { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardManipulationEnum } from './dashboard-manipulation.enum';
import { WidgetModel } from './dashboard-widget.model';
import { DashboardService } from './dashboard.service';

export interface WidgetEditDialogSize {
    minWidth?: string;
    minHeight?: string;
    width?: string;
}

/** Opens a widget edit dialog and applies the widget it closes with; size fields are only set when given. */
export function openWidgetEditDialog(
    dialog: MatDialog,
    dashboardService: DashboardService,
    component: ComponentType<unknown>,
    data: object,
    size?: WidgetEditDialogSize,
): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.data = data;
    if (size?.minWidth !== undefined) {
        dialogConfig.minWidth = size.minWidth;
    }
    if (size?.minHeight !== undefined) {
        dialogConfig.minHeight = size.minHeight;
    }
    if (size?.width !== undefined) {
        dialogConfig.width = size.width;
    }
    const editDialogRef = dialog.open(component, dialogConfig);

    editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
        if (widget !== undefined) {
            dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
        }
    });
}
