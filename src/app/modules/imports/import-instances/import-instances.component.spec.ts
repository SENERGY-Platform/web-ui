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
import {ImportInstancesComponent} from './import-instances.component';
import {CoreModule} from '../../../core/core.module';
import {Router, RouterModule} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {FlexModule} from '@angular/flex-layout';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDividerModule} from '@angular/material/divider';
import {MatSelectModule} from '@angular/material/select';
import {MatTreeModule} from '@angular/material/tree';
import {WidgetModule} from '../../../widgets/widget.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {ImportInstancesService} from './shared/import-instances.service';
import {of} from 'rxjs';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {MatTableModule} from '@angular/material/table';
import {ImportInstancesModel} from './shared/import-instances.model';
import {DialogsService} from '../../../core/services/dialogs.service';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { AuthorizationService } from 'src/app/core/services/authorization.service';

describe('ImportInstancesComponent', () => {
    let component: ImportInstancesComponent;
    let fixture: ComponentFixture<ImportInstancesComponent>;

    const testInstance: ImportInstancesModel = {
        import_type_id: 'typeid',
        name: 'test',
        kafka_topic: 'test-topic',
        id: 'test-id',
        restart: true,
        configs: [],
        image: 'test-image',
        created_at: new Date(),
        updated_at: new Date(),
        generated: false,
    };

    const importInstancesServiceSpy: Spy<ImportInstancesService> = createSpyFromClass(ImportInstancesService);
    importInstancesServiceSpy.listImportInstances.and.returnValue(of([testInstance]));
    importInstancesServiceSpy.deleteImportInstance.and.returnValue(of());
    importInstancesServiceSpy.userHasUpdateAuthorization.and.returnValue(of(true));
    importInstancesServiceSpy.userHasDeleteAuthorization.and.returnValue(of(true));
    importInstancesServiceSpy.userHasCreateAuthorization.and.returnValue(of(true));
    importInstancesServiceSpy.getTotalCountOfInstances.and.returnValue(of(0));

    const deleteDialogServiceSpy: Spy<DialogsService> = createSpyFromClass(DialogsService);
    deleteDialogServiceSpy.openDeleteDialog.and.returnValue({afterClosed: () => of(true)});

    const routerSpy: Spy<Router> = createSpyFromClass(Router);
    routerSpy.navigateByUrl.and.returnValue(new Promise(() => true));

    const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
    dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

    const searchbarSpy: Spy<SearchbarService> = createSpyFromClass(SearchbarService, {
        observablePropsToSpyOn: ['currentSearchText']
    });

    const permissionsServiceSpy: Spy<PermissionsService> = createSpyFromClass(PermissionsService);
    permissionsServiceSpy.getComputedResourcePermissionsV2.and.callFake((_, ids: string[]) => {
        const res: PermissionsV2RightsAndIdModel[] = [];
        ids.forEach(id => res.push({id, administrate: true, write: true, read: true, execute: true}));
        return of(res);
    });

    const authorizationServiceSpy: Spy<AuthorizationService> = createSpyFromClass(AuthorizationService);
    authorizationServiceSpy.getUserRoles.and.returnValue(['user']);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
    declarations: [ImportInstancesComponent],
    imports: [CoreModule,
        RouterModule.forRoot([], {}),
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatPaginatorModule,
        MatCheckboxModule,
        FlexModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatDividerModule,
        MatSelectModule,
        MatDialogModule,
        MatTreeModule,
        MatTableModule,
        WidgetModule,
        InfiniteScrollModule],
    providers: [
        { provide: ImportInstancesService, useValue: importInstancesServiceSpy },
        { provide: DialogsService, useValue: deleteDialogServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: SearchbarService, useValue: searchbarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: PermissionsService, useValue: permissionsServiceSpy },
        { provide: AuthorizationService, useValue: authorizationServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
    ]
}).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportInstancesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load data', () => {
        searchbarSpy.currentSearchText.nextWith('search');
        expect(component).toBeTruthy();
        expect(importInstancesServiceSpy.listImportInstances).toHaveBeenCalled();
    });

    it('should delete a instance', () => {
        component.delete(testInstance);
        expect(deleteDialogServiceSpy.openDeleteDialog).toHaveBeenCalled();
        expect(importInstancesServiceSpy.deleteImportInstance).toHaveBeenCalled();
    });

    it('should search', () => {
        importInstancesServiceSpy.listImportInstances.calls.reset();
        component.ngOnInit();
        searchbarSpy.currentSearchText.nextWith('search');
        expect(importInstancesServiceSpy.listImportInstances.calls.mostRecent().args[0]).toEqual('search');
    });

    it('should open the edit dialog', () => {
        dialogSpy.open.calls.reset();
        component.edit(testInstance);
        expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('should open the export dialog', () => {
        dialogSpy.open.calls.reset();
        component.export(testInstance);
        expect(dialogSpy.open).toHaveBeenCalled();
    });
});
