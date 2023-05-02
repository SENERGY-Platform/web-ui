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
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';

import {ImportTypesComponent} from './import-types.component';
import {CoreModule} from '../../../core/core.module';
import {Router, RouterModule} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {MatLegacyDialog as MatDialog, MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {FlexModule} from '@angular/flex-layout';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatDividerModule} from '@angular/material/divider';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatTreeModule} from '@angular/material/tree';
import {WidgetModule} from '../../../widgets/widget.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {ImportTypesService} from './shared/import-types.service';
import {of} from 'rxjs';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {ImportTypePermissionSearchModel} from './shared/import-types.model';
import {DialogsService} from '../../../core/services/dialogs.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';

describe('ImportTypesComponent', () => {
    let component: ImportTypesComponent;
    let fixture: ComponentFixture<ImportTypesComponent>;

    const importTypesServiceSpy: Spy<ImportTypesService> = createSpyFromClass(ImportTypesService);

    const permSearchModelExample = {
        id: '0',
        permissions: {
            a: true,
            r: true,
            w: true,
            x: true,
        },
    } as ImportTypePermissionSearchModel;
    importTypesServiceSpy.listImportTypes.and.returnValue(of([permSearchModelExample] as ImportTypePermissionSearchModel[]));

    importTypesServiceSpy.deleteImportInstance.and.returnValue(of());

    const deleteDialogServiceSpy: Spy<DialogsService> = createSpyFromClass(DialogsService);
    deleteDialogServiceSpy.openDeleteDialog.and.returnValue({afterClosed: () => of(true)});

    const routerSpy: Spy<Router> = createSpyFromClass(Router);
    routerSpy.navigateByUrl.and.returnValue(new Promise((_) => true));

    const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
    dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

    const permissionsDialogServiceSpy: Spy<PermissionsDialogService> = createSpyFromClass(PermissionsDialogService);

    const searchbarSpy: Spy<SearchbarService> = createSpyFromClass(SearchbarService)

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportTypesComponent],
            imports: [
                CoreModule,
                RouterModule.forRoot([], {}),
                MatDialogModule,
                MatSnackBarModule,
                FlexModule,
                MatTooltipModule,
                MatButtonModule,
                MatIconModule,
                WidgetModule,
                HttpClientModule,
                InfiniteScrollModule,
                MatTooltipModule,
                MatButtonModule,
                MatIconModule,
                MatFormFieldModule,
                MatInputModule,
                MatDividerModule,
                MatSelectModule,
                MatDialogModule,
                MatTreeModule,
                WidgetModule,
                ReactiveFormsModule,
                MatTableModule,
            ],
            providers: [
                {provide: ImportTypesService, useValue: importTypesServiceSpy},
                {provide: DialogsService, useValue: deleteDialogServiceSpy},
                {provide: PermissionsDialogService, useValue: permissionsDialogServiceSpy},
                {provide: Router, useValue: routerSpy},
                {provide: MatDialog, useValue: dialogSpy},
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportTypesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load data', () => {
        expect(component).toBeTruthy();
        expect(importTypesServiceSpy.listImportTypes).toHaveBeenCalled();
    });

    it('should delete a type', () => {
        component.delete(permSearchModelExample);
        expect(deleteDialogServiceSpy.openDeleteDialog).toHaveBeenCalled();
        expect(importTypesServiceSpy.deleteImportInstance).toHaveBeenCalled();
    });

    it('should search', fakeAsync(() =>  {
        importTypesServiceSpy.listImportTypes.calls.reset();
        searchbarSpy.changeMessage("search")
        tick(301);
        expect(importTypesServiceSpy.listImportTypes.calls.mostRecent().args[0]).toEqual('search');
    }));

    it('should open the edit view', () => {
        component.edit(permSearchModelExample);
        expect(routerSpy.navigateByUrl.calls.mostRecent().args[0]).toEqual('/imports/types/edit/0');
    });

    it('should open the detail view', () => {
        component.details(permSearchModelExample);
        expect(routerSpy.navigateByUrl.calls.mostRecent().args[0]).toEqual('/imports/types/details/0');
    });

    it('should open the add view', () => {
        component.add();
        expect(routerSpy.navigateByUrl.calls.mostRecent().args[0]).toEqual('/imports/types/new');
    });

    it('should open the start dialog', () => {
        dialogSpy.open.calls.reset();
        component.start(permSearchModelExample);
        expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('should open the permission dialog', () => {
        permissionsDialogServiceSpy.openPermissionDialog.calls.reset();
        component.share(permSearchModelExample);
        expect(permissionsDialogServiceSpy.openPermissionDialog).toHaveBeenCalled();
    });
});
