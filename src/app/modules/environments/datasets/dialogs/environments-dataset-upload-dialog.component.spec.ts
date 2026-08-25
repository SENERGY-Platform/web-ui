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
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { EnvironmentsDatasetUploadDialogComponent } from './environments-dataset-upload-dialog.component';
import { EnvironmentsService } from '../../shared/environments.service';
import { ApiError, DatasetMeta } from '../../shared/environments.model';

/** Builds a File-like object whose FileReader read resolves to the given text, mirroring environments.component.spec.ts. */
function fakeFileList(content: string, name = 'profile.csv'): FileList {
    const file = new File([content], name, { type: 'text/csv' });
    return { 0: file, length: 1, item: (_i: number) => file } as unknown as FileList;
}

class MockEnvironmentsService {
    calls: { name: string; content: string; tz?: string }[] = [];
    result: DatasetMeta | ApiError = { id: 'd1', name: 'profile' };

    uploadDatasetChecked(name: string, content: string, tz?: string): Observable<DatasetMeta | ApiError> {
        this.calls.push({ name, content, tz });
        return of(this.result);
    }
}

class MockDialogRef {
    closeCalled = false;
    closedWith: unknown;

    close(value?: unknown): void {
        this.closeCalled = true;
        this.closedWith = value;
    }
}

describe('EnvironmentsDatasetUploadDialogComponent', () => {
    let component: EnvironmentsDatasetUploadDialogComponent;
    let fixture: ComponentFixture<EnvironmentsDatasetUploadDialogComponent>;
    let environmentsService: MockEnvironmentsService;
    let dialogRef: MockDialogRef;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsDatasetUploadDialogComponent],
            imports: [
                CommonModule,
                FormsModule,
                NoopAnimationsModule,
                MatIconModule,
                MatButtonModule,
                MatFormFieldModule,
                MatInputModule,
                MatDialogModule,
            ],
            providers: [
                { provide: EnvironmentsService, useClass: MockEnvironmentsService },
                { provide: MatDialogRef, useClass: MockDialogRef },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsDatasetUploadDialogComponent);
        component = fixture.componentInstance;
        environmentsService = TestBed.inject(EnvironmentsService) as unknown as MockEnvironmentsService;
        dialogRef = TestBed.inject(MatDialogRef) as unknown as MockDialogRef;
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should prefill the name from the chosen file name without its extension', (done) => {
        fixture.detectChanges();
        const input = { files: fakeFileList('time,value\n1,2', 'profile.csv') } as unknown as HTMLInputElement;

        component.onFileSelected({ target: input } as unknown as Event);

        setTimeout(() => {
            expect(component.fileName).toBe('profile.csv');
            expect(component.name).toBe('profile');
            done();
        }, 50);
    });

    it('should not overwrite a name the user already typed', (done) => {
        fixture.detectChanges();
        component.name = 'Custom Name';
        const input = { files: fakeFileList('time,value\n1,2', 'profile.csv') } as unknown as HTMLInputElement;

        component.onFileSelected({ target: input } as unknown as Event);

        setTimeout(() => {
            expect(component.name).toBe('Custom Name');
            done();
        }, 50);
    });

    it('should disable Upload until a file is selected and a name is set', (done) => {
        fixture.detectChanges();
        expect(component.canUpload()).toBe(false);

        component.name = 'profile';
        expect(component.canUpload()).toBe(false); // still no file content

        const input = { files: fakeFileList('time,value\n1,2') } as unknown as HTMLInputElement;
        component.onFileSelected({ target: input } as unknown as Event);

        setTimeout(() => {
            expect(component.canUpload()).toBe(true);
            done();
        }, 50);
    });

    it('should call the service with the file content, the entered name and the timezone', (done) => {
        fixture.detectChanges();
        const input = { files: fakeFileList('time,value\n1,2', 'profile.csv') } as unknown as HTMLInputElement;
        component.onFileSelected({ target: input } as unknown as Event);
        component.timezone = 'Europe/Berlin';

        setTimeout(() => {
            component.upload();
            expect(environmentsService.calls).toEqual([{ name: 'profile', content: 'time,value\n1,2', tz: 'Europe/Berlin' }]);
            expect(dialogRef.closedWith).toEqual({ id: 'd1', name: 'profile' });
            done();
        }, 50);
    });

    // The whole point of the checked upload: a 400 names the broken CSV line, and that
    // text has to reach the user inside the still-open dialog, not a snackbar that vanishes.
    it('should show the API error message in the dialog and keep it open instead of closing', (done) => {
        environmentsService.result = { message: 'line 3: "not-a-number" is not a valid timestamp' };
        fixture.detectChanges();
        const input = { files: fakeFileList('time,value\n1,2\nnot-a-number,3', 'profile.csv') } as unknown as HTMLInputElement;
        component.onFileSelected({ target: input } as unknown as Event);

        setTimeout(() => {
            component.upload();
            expect(component.errorMessage).toBe('line 3: "not-a-number" is not a valid timestamp');
            expect(dialogRef.closeCalled).toBe(false);
            expect(component.isUploading).toBe(false);
            done();
        }, 50);
    });

    it('should close without a value on cancel', () => {
        fixture.detectChanges();
        component.cancel();
        expect(dialogRef.closeCalled).toBe(true);
        expect(dialogRef.closedWith).toBeUndefined();
    });

    it('should click the hidden file input when Choose File is triggered', () => {
        fixture.detectChanges();
        const clickSpy = jasmine.createSpy('click');
        component.fileInput = { nativeElement: { click: clickSpy } } as any;

        component.triggerFilePicker();

        expect(clickSpy).toHaveBeenCalled();
    });

    // Otherwise picking the same (now-corrected) file again after a failed upload fires no
    // 'change' event at all, since the browser only fires it when the input's value differs.
    it('should reset the file input value after a successful read', (done) => {
        fixture.detectChanges();
        const input = { value: 'profile.csv', files: fakeFileList('time,value\n1,2', 'profile.csv') } as unknown as HTMLInputElement;

        component.onFileSelected({ target: input } as unknown as Event);

        setTimeout(() => {
            expect(input.value).toBe('');
            done();
        }, 50);
    });

    describe('when the FileReader itself fails', () => {
        let originalFileReader: typeof FileReader;
        let fakeReader: { onload: (() => void) | null; onerror: (() => void) | null; result: string | null; readAsText: jasmine.Spy };

        beforeEach(() => {
            originalFileReader = window.FileReader;
            fakeReader = { onload: null, onerror: null, result: null, readAsText: jasmine.createSpy('readAsText') };
            (window as any).FileReader = function (): unknown {
                return fakeReader;
            };
        });

        afterEach(() => {
            window.FileReader = originalFileReader;
        });

        it('shows an error message and resets the input instead of leaving the dialog stuck', () => {
            fixture.detectChanges();
            const input = { value: 'profile.csv', files: fakeFileList('irrelevant', 'profile.csv') } as unknown as HTMLInputElement;

            component.onFileSelected({ target: input } as unknown as Event);
            fakeReader.onerror?.();

            expect(component.errorMessage).toBe('Could not read the file.');
            expect(component.canUpload()).toBe(false);
            expect(input.value).toBe('');
        });
    });
});
