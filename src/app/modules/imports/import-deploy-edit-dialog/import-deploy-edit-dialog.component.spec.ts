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

import {ImportDeployEditDialogComponent} from './import-deploy-edit-dialog.component';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ImportInstancesModel} from '../import-instances/shared/import-instances.model';
import {ImportTypesService} from '../import-types/shared/import-types.service';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {ReactiveFormsModule} from '@angular/forms';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {HttpClientModule} from '@angular/common/http';
import {of} from 'rxjs';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

describe('ImportDeployDialogComponent', () => {
    let component: ImportDeployEditDialogComponent;
    let fixture: ComponentFixture<ImportDeployEditDialogComponent>;

    const importTypeServiceSpy: Spy<ImportTypesService> = createSpyFromClass(ImportTypesService);
    importTypeServiceSpy.getImportType.and.returnValue(of({
        id: 'test-id',
        name: 'name',
        description: '',
        image: 'test-image',
        default_restart: true,
        configs: [],
        aspect_ids: [],
        output: {
            name: 'output',
            type: 'https://schema.org/Text',
            characteristic_id: '',
            sub_content_variables: null,
            use_as_tag: false,
        },
        function_ids: [],
        owner: 'user',
    }));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportDeployEditDialogComponent],
            imports: [
                MatDialogModule,
                MatTooltipModule,
                MatButtonModule,
                MatIconModule,
                MatFormFieldModule,
                MatInputModule,
                ReactiveFormsModule,
                MatSnackBarModule,
                HttpClientModule,
                MatCheckboxModule,
                BrowserAnimationsModule,
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA, useValue: {
                        name: 'name',
                        import_type_id: 'test-id',
                    } as ImportInstancesModel
                },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (_: any) => {
                        }
                    }
                },
                {provide: ImportTypesService, useValue: importTypeServiceSpy},
            ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportDeployEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
