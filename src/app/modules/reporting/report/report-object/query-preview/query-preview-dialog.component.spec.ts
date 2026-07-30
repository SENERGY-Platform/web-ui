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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { QueryPreviewData, QueryPreviewDialogComponent } from './query-preview-dialog.component';

describe('QueryPreviewDialogComponent', () => {
    let component: QueryPreviewDialogComponent;
    let fixture: ComponentFixture<QueryPreviewDialogComponent>;
    const dialogRef = { close: jasmine.createSpy('close') };

    const configure = (data: QueryPreviewData) => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [QueryPreviewDialogComponent],
            imports: [CommonModule, NoopAnimationsModule, MatDialogModule, MatTableModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: dialogRef },
            ]
        });
        fixture = TestBed.createComponent(QueryPreviewDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    };

    it('should show a column per value of a row', waitForAsync(() => {
        configure({ rows: [['2026-01-01T00:00:00Z', 1], ['2026-02-01T00:00:00Z', 2]] });

        expect(component.columns.map((column) => column.label)).toEqual(['Key 1', 'Key 2']);
        expect(component.displayedColumns.length).toBe(3);
        expect(component.totalRows).toBe(2);
        expect(component.truncated).toBe(false);
        expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(2);
    }));

    it('should number the columns', waitForAsync(() => {
        configure({ rows: [[1, 2, 3]] });

        expect(component.columns.map((column) => column.label)).toEqual(['Key 1', 'Key 2', 'Key 3']);
    }));

    it('should use the longest row for the number of columns', waitForAsync(() => {
        configure({ rows: [[1], [1, 2]] });

        expect(component.columns.length).toBe(2);
    }));

    it('should limit the shown rows', waitForAsync(() => {
        const rows = Array.from({ length: 250 }, (_, i) => [i]);
        configure({ rows });

        expect(component.totalRows).toBe(250);
        expect(component.rows.length).toBe(200);
        expect(component.truncated).toBe(true);
    }));

    it('should recognize numbers and timestamps', waitForAsync(() => {
        configure({ rows: [[1, 'a']] });

        expect(component.isNumber(1)).toBe(true);
        expect(component.isNumber('1')).toBe(false);
        expect(component.isTimestamp('2026-01-01T00:00:00Z')).toBe(true);
        expect(component.isTimestamp('2026')).toBe(false);
    }));

    it('should display values that are no plain text', waitForAsync(() => {
        configure({ rows: [[null]] });

        expect(component.display(null)).toBe('-');
        expect(component.display(undefined)).toBe('-');
        expect(component.display({ a: 1 })).toBe('{"a":1}');
        expect(component.display(0)).toBe('0');
    }));

    it('should close the dialog', waitForAsync(() => {
        configure({ rows: [[1]] });

        component.onCloseClick();

        expect(dialogRef.close).toHaveBeenCalled();
    }));
});
