/*
 * Copyright 2025 InfAI (CC SES)
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


import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { getRfc5280ReasonStrings, Rfc5280Reason, rfc5280ReasonCode } from '../shared/certificates.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { FormsModule } from '@angular/forms';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-certificate-revoke-dialog',
    templateUrl: './certificate-revoke-dialog.component.html',
    styleUrl: './certificate-revoke-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatFormField, MatLabel, MtxSelect, FormsModule, MtxOption, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton]
})
export class CertificateRevokeDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CertificateRevokeDialogComponent>,
  ) { }

  reason: Rfc5280Reason | null = null;
  reasons = getRfc5280ReasonStrings();
  rfc5280ReasonCode = rfc5280ReasonCode;

  close() {
    this.dialogRef.close();
  }

  revoke() {
    this.dialogRef.close(this.reason);
  }
}
