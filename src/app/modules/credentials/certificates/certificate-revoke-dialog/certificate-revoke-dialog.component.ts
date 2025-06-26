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


import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { getRfc5280ReasonStrings, Rfc5280Reason, rfc5280ReasonCode } from '../shared/certificates.model';

@Component({
  selector: 'app-certificate-revoke-dialog',
  templateUrl: './certificate-revoke-dialog.component.html',
  styleUrl: './certificate-revoke-dialog.component.css'
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
