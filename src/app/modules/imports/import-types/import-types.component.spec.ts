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
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ImportTypesComponent} from './import-types.component';
import {CoreModule} from '../../../core/core.module';
import {Router, RouterModule} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDividerModule} from '@angular/material/divider';
import {MatTreeModule} from '@angular/material/tree';
import {WidgetModule} from '../../../widgets/widget.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {ImportTypesService} from './shared/import-types.service';
import {of} from 'rxjs';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {MatTableModule} from '@angular/material/table';
import {DialogsService} from '../../../core/services/dialogs.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { CostService } from '../../cost/shared/cost.service';
import { ImportTypeModel } from './shared/import-types.model';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ImportTypesComponent', () => {
    let component: ImportTypesComponent;
    let fixture: ComponentFixture<ImportTypesComponent>;

    const importTypesServiceSpy: Spy<ImportTypesService> = createSpyFromClass(ImportTypesService);

    const permSearchModelExample = {
        id: '0',
        name: 'example',
    } as ImportTypeModel;
    importTypesServiceSpy.listImportTypes.and.returnValue(of({result: [permSearchModelExample], total: 1}));

    importTypesServiceSpy.deleteImportInstance.and.returnValue(of());
    importTypesServiceSpy.userHasUpdateAuthorization.and.returnValue(of(true));
    importTypesServiceSpy.userHasDeleteAuthorization.and.returnValue(of(true));
    importTypesServiceSpy.userHasCreateAuthorization.and.returnValue(of(true));

    const deleteDialogServiceSpy: Spy<DialogsService> = createSpyFromClass(DialogsService);
    deleteDialogServiceSpy.openDeleteDialog.and.returnValue({afterClosed: () => of(true)});

    const routerSpy: Spy<Router> = createSpyFromClass(Router);
    routerSpy.navigateByUrl.and.returnValue(new Promise((_) => true));

    const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
    dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

    const permissionsDialogServiceSpy: Spy<PermissionsDialogService> = createSpyFromClass(PermissionsDialogService);

    const searchbarSpy: Spy<SearchbarService> = createSpyFromClass(SearchbarService, {
        observablePropsToSpyOn: ['currentSearchText']
    });

    const costServiceSpy: Spy<CostService> = createSpyFromClass(CostService);
    costServiceSpy.userMayGetImportCostEstimations.and.returnValue(false);

    const permissionsServiceSpy: Spy<PermissionsService> = createSpyFromClass(PermissionsService);
    permissionsServiceSpy.getComputedResourcePermissionsV2.and.callFake((_: string, ressourceIds: string[]) => of(ressourceIds.map(id => ({id, execute: true, read: true, write: true, administrate: true}))));

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [ImportTypesComponent],
    imports: [CoreModule,
        RouterModule.forRoot([], {}),
        MatDialogModule,
        MatSnackBarModule,
        FlexModule,
        MatTooltipModule,
        MatButtonModule,
        MatPaginatorModule,
        MatIconModule,
        WidgetModule,
        InfiniteScrollModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatDividerModule,
        MatDialogModule,
        MatTreeModule,
        WidgetModule,
        ReactiveFormsModule,
        MatTableModule],
    providers: [
        { provide: ImportTypesService, useValue: importTypesServiceSpy },
        { provide: DialogsService, useValue: deleteDialogServiceSpy },
        { provide: PermissionsDialogService, useValue: permissionsDialogServiceSpy },
        { provide: SearchbarService, useValue: searchbarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: CostService, useValue: costServiceSpy },
        { provide: PermissionsService, useValue: permissionsServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
    ]
}).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportTypesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load data', () => {
        searchbarSpy.currentSearchText.nextWith('search');
        expect(component).toBeTruthy();
        expect(importTypesServiceSpy.listImportTypes).toHaveBeenCalled();
        expect(permissionsServiceSpy.getComputedResourcePermissionsV2).toHaveBeenCalled();
    });

    it('should delete a type', () => {
        component.delete(permSearchModelExample);
        expect(deleteDialogServiceSpy.openDeleteDialog).toHaveBeenCalled();
        expect(importTypesServiceSpy.deleteImportInstance).toHaveBeenCalled();
    });

    it('should search', () =>  {
        importTypesServiceSpy.listImportTypes.calls.reset();
        component.ngOnInit();
        searchbarSpy.currentSearchText.nextWith('search');
        expect(importTypesServiceSpy.listImportTypes.calls.mostRecent().args[0]).toEqual('search');
    });

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
        permissionsDialogServiceSpy.openPermissionV2Dialog.calls.reset();
        component.share(permSearchModelExample);
        expect(permissionsDialogServiceSpy.openPermissionV2Dialog).toHaveBeenCalled();
    });
});
