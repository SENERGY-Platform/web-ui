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

import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { EnvironmentsService } from '../../shared/environments.service';
import { DatasetMeta, isApiError } from '../../shared/environments.model';

/**
 * Kept open on failure so the API's error -- typically naming the broken CSV line -- stays
 * visible next to the file that caused it, rather than flashing by in a snackbar.
 */
@Component({
    selector: 'senergy-environments-dataset-upload-dialog',
    templateUrl: './environments-dataset-upload-dialog.component.html',
    styleUrls: ['./environments-dataset-upload-dialog.component.css'],
})
export class EnvironmentsDatasetUploadDialogComponent {
    fileName = '';
    name = '';
    timezone = 'Europe/Berlin';
    isUploading = false;
    errorMessage = '';

    @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

    private content = '';

    constructor(
        private dialogRef: MatDialogRef<EnvironmentsDatasetUploadDialogComponent>,
        private environmentsService: EnvironmentsService,
    ) {}

    triggerFilePicker(): void {
        this.fileInput?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        this.fileName = file.name;
        if (!this.name) {
            this.name = file.name.replace(/\.[^./\\]+$/, '');
        }
        this.errorMessage = '';
        const reader = new FileReader();
        reader.onload = () => {
            this.content = reader.result as string;
            input.value = ''; // otherwise re-picking the same (now-fixed) file fires no change event
        };
        reader.onerror = () => {
            this.errorMessage = 'Could not read the file.';
            this.fileName = '';
            this.content = '';
            input.value = '';
        };
        reader.readAsText(file);
    }

    canUpload(): boolean {
        return !!this.content && !!this.name && !this.isUploading;
    }

    cancel(): void {
        this.dialogRef.close();
    }

    upload(): void {
        if (!this.canUpload()) {
            return;
        }
        this.isUploading = true;
        this.errorMessage = '';
        this.environmentsService.uploadDatasetChecked(this.name, this.content, this.timezone || undefined).subscribe((result) => {
            this.isUploading = false;
            if (isApiError(result)) {
                this.errorMessage = result.message;
                return;
            }
            this.dialogRef.close(result as DatasetMeta);
        });
    }
}
