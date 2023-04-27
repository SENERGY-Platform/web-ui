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
import {ImportInstancesComponent} from './import-instances.component';
import {CoreModule} from '../../../core/core.module';
import {Router, RouterModule} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {MatLegacyDialog as MatDialog, MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
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
import {ImportInstancesService} from './shared/import-instances.service';
import {of} from 'rxjs';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {ImportInstancesModel} from './shared/import-instances.model';
import {DialogsService} from '../../../core/services/dialogs.service';

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

    const deleteDialogServiceSpy: Spy<DialogsService> = createSpyFromClass(DialogsService);
    deleteDialogServiceSpy.openDeleteDialog.and.returnValue({afterClosed: () => of(true)});

    const routerSpy: Spy<Router> = createSpyFromClass(Router);
    routerSpy.navigateByUrl.and.returnValue(new Promise(() => true));

    const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
    dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportInstancesComponent],
            imports: [
                CoreModule,
                RouterModule.forRoot([], {}),
                ReactiveFormsModule,
                HttpClientModule,
                MatDialogModule,
                MatSnackBarModule,
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
                InfiniteScrollModule,
            ],
            providers: [
                {provide: ImportInstancesService, useValue: importInstancesServiceSpy},
                {provide: DialogsService, useValue: deleteDialogServiceSpy},
                {provide: Router, useValue: routerSpy},
                {provide: MatDialog, useValue: dialogSpy},
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportInstancesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load data', () => {
        expect(component).toBeTruthy();
        expect(importInstancesServiceSpy.listImportInstances).toHaveBeenCalled();
    });

    it('should delete a instance', () => {
        component.delete(testInstance);
        expect(deleteDialogServiceSpy.openDeleteDialog).toHaveBeenCalled();
        expect(importInstancesServiceSpy.deleteImportInstance).toHaveBeenCalled();
    });

    it('should search', fakeAsync(() => {
        importInstancesServiceSpy.listImportInstances.calls.reset();
        component.searchControl.patchValue('search');
        tick(301);
        expect(importInstancesServiceSpy.listImportInstances.calls.mostRecent().args[0]).toEqual('search');
    }));

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
