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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { EnvironmentsVersionConflictDialogComponent } from './environments-version-conflict-dialog.component';

describe('EnvironmentsVersionConflictDialogComponent', () => {
    let component: EnvironmentsVersionConflictDialogComponent;
    let fixture: ComponentFixture<EnvironmentsVersionConflictDialogComponent>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<EnvironmentsVersionConflictDialogComponent>>;

    beforeEach(() => {
        dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsVersionConflictDialogComponent],
            imports: [NoopAnimationsModule, MatDialogModule, MatButtonModule],
            providers: [{ provide: MatDialogRef, useValue: dialogRef }],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsVersionConflictDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('reload() closes with true', () => {
        component.reload();
        expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('keepEditing() closes with false, leaving the caller\'s dirty state untouched', () => {
        component.keepEditing();
        expect(dialogRef.close).toHaveBeenCalledWith(false);
    });
});
