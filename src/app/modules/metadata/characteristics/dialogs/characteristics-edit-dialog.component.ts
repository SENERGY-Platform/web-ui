/*
 * Copyright 2021 InfAI (CC SES)
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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { CharacteristicsPermSearchModel } from '../shared/characteristics-perm-search.model';
import { CharacteristicsService } from '../shared/characteristics.service';
import { DeviceTypeCharacteristicsModel } from '../../device-types-overview/shared/device-type.model';
import { CharacteristicElementComponent } from './characteristic-element/characteristic-element.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './characteristics-edit-dialog.component.html',
    styleUrls: ['./characteristics-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, CharacteristicElementComponent, MatDialogActions, MatButton]
})
export class CharacteristicsEditDialogComponent implements OnInit, AfterViewInit {
    private conceptsService = inject(ConceptsService);
    private characteristicsService = inject(CharacteristicsService);
    private destroyRef = inject(DestroyRef);
    private dialogRef = inject<MatDialogRef<CharacteristicsEditDialogComponent>>(MatDialogRef);

    @ViewChild('characteristicElementComponent', { static: false }) characteristicElementComponent!: CharacteristicElementComponent;

    characteristicPerm: CharacteristicsPermSearchModel | undefined = undefined;

    baseCharacteristic: DeviceTypeCharacteristicsModel | undefined = undefined;

    disabled: boolean;

    constructor() {
        const data = inject(MAT_DIALOG_DATA);

        if (data !== null) {
            this.characteristicPerm = data.characteristic;
        }
        this.disabled = !!data?.disabled;
    }

    ngOnInit(): void {
        if (this.characteristicPerm !== undefined) {
            this.characteristicsService.getCharacteristic(this.characteristicPerm.id).subscribe((characteristic) => {
                this.baseCharacteristic = characteristic;
                this.characteristicElementComponent.patch(characteristic);
            });
        }
    }

    ngAfterViewInit() {
        this.characteristicElementComponent.valueChange.asObservable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            this.baseCharacteristic = value;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close({characteristic: this.baseCharacteristic });
    }
}
