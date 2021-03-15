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
import {HttpClientModule} from '@angular/common/http';
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
    routerSpy.navigateByUrl.and.returnValue(new Promise(_ => true));

    const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
    dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportInstancesComponent],
            imports: [
                CoreModule,
                RouterModule.forRoot([], { relativeLinkResolution: 'legacy' }),
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
            ]
        })
            .compileComponents();
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

    it('should search', () => {
        jasmine.clock().install();
        importInstancesServiceSpy.listImportInstances.calls.reset();
        component.searchControl.patchValue('search');
        jasmine.clock().tick(301);
        expect(importInstancesServiceSpy.listImportInstances.calls.mostRecent().args[0]).toEqual('search');
        jasmine.clock().uninstall();
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
