/*
 * Copyright 2024 InfAI (CC SES)
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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface QueryPreviewData {
    /** One entry per row, each with one value per column. */
    rows: any[][];
}

interface PreviewColumn {
    key: string;
    label: string;
    index: number;
}

const INDEX_COLUMN = '__index';
const MAX_ROWS = 200;

@Component({
    selector: 'senergy-reporting-query-preview-dialog',
    templateUrl: './query-preview-dialog.component.html',
    styleUrls: ['./query-preview-dialog.component.css'],
})
export class QueryPreviewDialogComponent {

    columns: PreviewColumn[] = [];
    displayedColumns: string[] = [];
    rows: any[][] = [];
    totalRows = 0;

    constructor(@Inject(MAT_DIALOG_DATA) data: QueryPreviewData,
        private dialogRef: MatDialogRef<QueryPreviewDialogComponent>) {
        const rows = data.rows || [];
        this.totalRows = rows.length;
        this.rows = rows.slice(0, MAX_ROWS);
        this.columns = this.buildColumns(rows);
        this.displayedColumns = [INDEX_COLUMN].concat(this.columns.map((column: PreviewColumn) => column.key));
    }

    get indexColumn(): string {
        return INDEX_COLUMN;
    }

    get truncated(): boolean {
        return this.totalRows > this.rows.length;
    }

    isNumber(value: any): boolean {
        return typeof value === 'number';
    }

    isTimestamp(value: any): boolean {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value);
    }

    display(value: any): string {
        if (value === null || value === undefined) {
            return '-';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    onCloseClick(): void {
        this.dialogRef.close();
    }

    private buildColumns(rows: any[][]): PreviewColumn[] {
        const count = rows.reduce((max: number, row: any[]) => Math.max(max, (row || []).length), 0);
        const columns: PreviewColumn[] = [];
        for (let index = 0; index < count; index++) {
            columns.push({ key: 'column' + index, label: 'Key ' + (index + 1), index });
        }
        return columns;
    }
}
