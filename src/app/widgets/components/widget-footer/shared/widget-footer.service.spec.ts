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


import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, of } from 'rxjs';

import { WidgetFooterService } from './widget-footer.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from '../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { DialogsService } from '../../../../core/services/dialogs.service';

describe('WidgetFooterService', () => {
    let service: WidgetFooterService;
    let dashboardService: jasmine.SpyObj<DashboardService>;
    let snackOpen: jasmine.Spy;

    beforeEach(() => {
        dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['deleteWidget', 'manipulateWidget']);
        TestBed.configureTestingModule({
            providers: [
                { provide: DashboardService, useValue: dashboardService },
                { provide: MatDialog, useValue: {} },
                { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: MatSnackBar, useValue: { open: (snackOpen = jasmine.createSpy('open').and.returnValue({ afterDismissed: () => EMPTY })) } },
            ],
        });
        service = TestBed.inject(WidgetFooterService);
    });

    it('keeps the widget and names the action when the delete failed', () => {
        dashboardService.deleteWidget.and.returnValue(of(null));
        service.openDeleteWidgetDialog('d1', 'w1');
        expect(dashboardService.manipulateWidget).not.toHaveBeenCalled();
        expect(snackOpen.calls.mostRecent().args[0]).toContain('Widget could not be deleted');
    });

    it('removes the widget after a successful delete', () => {
        dashboardService.deleteWidget.and.returnValue(of({ message: 'OK' }));
        service.openDeleteWidgetDialog('d1', 'w1');
        expect(dashboardService.manipulateWidget).toHaveBeenCalledWith(DashboardManipulationEnum.Delete, 'w1', null);
        expect(snackOpen).not.toHaveBeenCalled();
    });
});
