/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MtxSelect } from '@ng-matero/extensions/select';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { DialogHeaderComponent } from '../../../../core/components/dialog-header/dialog-header.component';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { toRfc3339Seconds } from '../../../environments/shared/environments-datetime';
import { ThingDeviceLinkCreateModel } from '../shared/things.model';

/** Until has to lie after from; checked only when both are set. */
function untilAfterFrom(control: AbstractControl): ValidationErrors | null {
    const from = control.parent?.get('from')?.value;
    const until = control.value;
    if (!from || !until) {
        return null;
    }
    return new Date(until).getTime() > new Date(from).getTime() ? null : { untilBeforeFrom: true };
}

/** Asks for the device and the period of a new link; closes with a ThingDeviceLinkCreateModel or undefined. */
@Component({
    templateUrl: './things-device-link-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: ['.full-width { width: 100%; }'],
    imports: [
        DialogHeaderComponent,
        CdkScrollable,
        MatDialogContent,
        MatDialogActions,
        CloseMtxSelectOnScrollDirective,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatHint,
        MatError,
        MatInput,
        MtxSelect,
        MatErrorMessagesDirective,
        MatButton,
    ],
})
export class ThingsDeviceLinkDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<ThingsDeviceLinkDialogComponent, ThingDeviceLinkCreateModel>>(MatDialogRef);
    private deviceInstancesService = inject(DeviceInstancesService);
    private destroyRef = inject(DestroyRef);

    devices: { id: string; label: string }[] = [];
    form = new FormGroup({
        device_id: new FormControl<string | null>(null, Validators.required),
        from: new FormControl<string>('', { nonNullable: true }),
        until: new FormControl<string>('', { nonNullable: true, validators: untilAfterFrom }),
    });

    ngOnInit(): void {
        this.form.controls.from.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.form.controls.until.updateValueAndValidity());
        this.deviceInstancesService
            .getDeviceInstances({ limit: 9999, offset: 0 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((devices) => {
                this.devices = (devices.result || []).map((d) => ({ id: d.id, label: d.display_name || d.name || d.id }));
            });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid) {
            return;
        }
        const raw = this.form.getRawValue();
        const link: ThingDeviceLinkCreateModel = { device_id: raw.device_id as string };
        if (raw.from) {
            link.from = toRfc3339Seconds(raw.from);
        }
        if (raw.until) {
            link.until = toRfc3339Seconds(raw.until);
        }
        this.dialogRef.close(link);
    }
}
