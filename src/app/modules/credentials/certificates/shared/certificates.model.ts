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

export interface CertificateInfo {
    serial_number: string;
    authority_key_identifier: string;
    sans: string[];
    issued_at: string; // Date
    not_before: string; // Date
    expiry: string; // Date
    revoked_at: string; // Date
    reason: number;

    expired: boolean; // calculated in web-ui
    revoked: boolean; // calculated in web-ui
}

export enum Rfc5280Reason {
    Unspecified = 0,
    KeyCompromise = 1,
    CACompromise = 2,
    AffiliationChanged = 3,
    Superseded = 4,
    CessationOfOperation = 5,
    CertificateHold = 6,
    Unused = 7,
    RemoveFromCRL = 8,
    PrivilegeWithdrawn = 9,
    AACompromise = 10
}

const rfc5280ReasonStrings = [
    'Unspecified',
    'KeyCompromise',
    'CACompromise',
    'AffiliationChanged',
    'Superseded',
    'CessationOfOperation',
    'CertificateHold',
    'Unused', // value 7 is not used
    'RemoveFromCRL',
    'PrivilegeWithdrawn',
    'AACompromise',
];

export function getRfc5280ReasonStrings(): string[] {
    return rfc5280ReasonStrings.filter(x => x !== 'Unused');
}

export function rfc5280ReasonString(code: Rfc5280Reason): string {
    if (code < rfc5280ReasonStrings.length) {
        return rfc5280ReasonStrings[code];
    }
    return 'Unknown Code';
}

export function rfc5280ReasonCode(codeString: string): Rfc5280Reason {
    return rfc5280ReasonStrings.indexOf(codeString);
}