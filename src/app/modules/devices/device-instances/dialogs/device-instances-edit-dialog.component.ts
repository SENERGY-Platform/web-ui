/*
 * Copyright 2020 InfAI (CC SES)
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

import { ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Attribute, DeviceInstanceModel, DeviceInstanceWithDeviceTypeModel } from '../shared/device-instances.model';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { senergyConnectorLocalIdConstraint } from '../../../metadata/device-types-overview/shared/device-type.model';
import { AddTagFn } from '@ng-matero/extensions/select';
import jsQR from 'jsqr';

@Component({
    templateUrl: './device-instances-edit-dialog.component.html',
    styleUrls: ['./device-instances-edit-dialog.component.css'],
})
export class DeviceInstancesEditDialogComponent implements OnDestroy {
    @ViewChild('qrVideo') qrVideo?: ElementRef<HTMLVideoElement>;

    device: DeviceInstanceModel | DeviceInstanceWithDeviceTypeModel;
    displayname = '';
    nicknameAttributeKey = 'shared/nickname';
    nicknameAttributeOrigin = 'shared';
    action = 'Edit';
    localIdIsEditable = false;
    knownAttributes = ['anomaly-detector', 'timezone', 'inactive', 'last_message_max_age', 'monitor_connection_state', 'platform/mute-format-error', 'senergy/snowflake-canary-device', 'senergy/canary-device', 'senergy/lora/dev-addr', 'senergy/lora/app-key', 'senergy/lora/gen-app-key', 'senergy/lora/nwk-key', 'senergy/lora/app-s-key', 'senergy/lora/nwk-s-enc-key', 'senergy/lora/s-nwk-s-int-key', 'senergy/lora/f-nwk-s-int-key', 'senergy/lora/join-eui', 'senergy/lora/duplicate'];

    protocolConstraints: string[] = [];
    userHasUpdateDisplayNameAuthorization = false;
    userHasUpdateAttributesAuthorization = false;
    deviceTypeSupportsQR = false;
    qrScanSupported = false;
    qrScanInProgress = false;

    private qrScannerId: number | undefined;
    private qrMediaStream: MediaStream | undefined;
    private qrCanvas = document.createElement('canvas');

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesEditDialogComponent>,
        private deviceTypeService: DeviceTypeService,
        private cd: ChangeDetectorRef,

        @Inject(MAT_DIALOG_DATA) private data: {
            device: DeviceInstanceModel | DeviceInstanceWithDeviceTypeModel;
            userHasUpdateDisplayNameAuthorization: boolean;
            userHasUpdateAttributesAuthorization: boolean;
            action?: string;
            localIdIsEditable?: boolean;
        },
    ) {
        this.userHasUpdateDisplayNameAuthorization = data.userHasUpdateDisplayNameAuthorization;
        this.userHasUpdateAttributesAuthorization = data.userHasUpdateAttributesAuthorization;
        this.device = data.device;
        this.qrScanSupported = !!navigator.mediaDevices?.getUserMedia;
        let supportsOTAA = false;
        (this.device as DeviceInstanceWithDeviceTypeModel).device_type?.attributes?.forEach(attr => {
            if (attr.key === 'senergy/lora/supports-otaa' && attr.value === 'true') {
                supportsOTAA = true;
            }
            if (attr.key === 'senergy/managed-by' && attr.value === 'lorawan-platform-connector') {
                this.deviceTypeSupportsQR = true;
            }
        });
        let hasOTAA = false;
        this.device.attributes?.forEach(value => {
            if (value.key === 'senergy/lora/nwk-key') {
                hasOTAA = true;
            }
            if (value.key === this.nicknameAttributeKey) {
                this.displayname = value.value;
            } else if (this.knownAttributes.indexOf(value.key) === -1) {
                this.addAttribute()(value.key);
            }
        });
        if (supportsOTAA && !hasOTAA) {
            this.addAttr();
            this.device.attributes![this.device.attributes!.length - 1].key = 'senergy/lora/nwk-key'; // ensure by addAttr()
        }

        const protocolsToConstraints: Map<string, string[]> = new Map<string, string[]>();
        this.deviceTypeService.getProtocols(9999, 0, 'name', 'asc').subscribe(protocols => {
            if (protocols) {
                protocols.forEach(p => {
                    protocolsToConstraints.set(p.id, p.constraints);
                });
            }
            this.deviceTypeService.getDeviceType(this.device.device_type_id).subscribe(dt => {
                if (dt) {
                    dt.services.forEach(s => {
                        this.protocolConstraints = this.protocolConstraints.concat(protocolsToConstraints.get(s.protocol_id) || []);
                    });
                }
            });
        });

        if (data.action != null) {
            this.action = data.action;
        }

        if (data.localIdIsEditable != null) {
            this.localIdIsEditable = data.localIdIsEditable;
        }

    }
    close(): void {
        this.stopQrScan();
        this.dialogRef.close();
    }

    save(): void {
        this.stopQrScan();
        this.setDisplayNameAttribute();
        this.dialogRef.close(this.device);
    }

    ngOnDestroy(): void {
        this.stopQrScan();
    }

    removeAttr(i: number) {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes.splice(i, 1);
    }

    addAttr() {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes.push({ key: '', value: '', origin: 'web-ui' });
    }

    editableAttribute(attr: Attribute) {
        return !attr.origin || attr.origin === '' || attr.origin === 'web-ui';
    }

    private setDisplayNameAttribute() {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes = this.device.attributes?.filter((value) => value.key !== this.nicknameAttributeKey);
        if (this.displayname !== '') {
            this.device.attributes?.push({
                key: this.nicknameAttributeKey,
                origin: this.nicknameAttributeOrigin,
                value: this.displayname
            } as Attribute);
            this.device.display_name = this.displayname;
        }
    }

    isValid(): boolean {
        if (!this.localIdFieldIsValid()) {
            return false;
        }
        return true;
    }

    localIdFieldIsValid(): boolean {
        return !this.protocolConstraints?.includes(senergyConnectorLocalIdConstraint) || isValidLocalId(this.device.local_id);
    }

    isValidLocalIdValidator(c: AbstractControl): ValidationErrors | null {
        if (!this.protocolConstraints?.includes(senergyConnectorLocalIdConstraint) || isValidLocalId(c.value)) {
            return null;
        } else {
            return {
                validateLocalId: {
                    valid: false
                }
            };
        }
    }

    addAttribute(): AddTagFn {
        const that = this;
        return (text: string) => {
            that.knownAttributes.push(text);
            const tmp = [...that.knownAttributes];
            tmp.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            that.knownAttributes = [];
            that.knownAttributes = tmp;
        };
    }

    startQrScan(): void {
        if (!this.deviceTypeSupportsQR) {
            return;
        }
        if (!this.qrScanSupported) {
            console.log('QR scanner is not supported by this browser.');
            return;
        }
        if (this.qrScanInProgress) {
            return;
        }

        console.log('Starting camera...');

        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: 'environment'
                }
            }
        }).then(stream => {
            this.qrMediaStream = stream;
            this.qrScanInProgress = true;

            const video = this.qrVideo?.nativeElement;
            if (!video) {
                console.log('Unable to initialize camera preview.');
                this.stopQrScan();
                return;
            }

            video.srcObject = stream;
            video.setAttribute('playsinline', 'true');
            video.play().then(() => {
                console.log('Scanning QR code...');
                this.qrScannerLoop();
            }).catch(() => {
                console.log('Unable to start camera preview.');
                this.stopQrScan();
            });
            this.cd.detectChanges();
        }).catch(() => {
            console.log('Camera access denied or unavailable.');
            this.qrScanInProgress = false;
            this.cd.detectChanges();
        });
    }

    stopQrScan(): void {
        if (this.qrScannerId != null) {
            cancelAnimationFrame(this.qrScannerId);
            this.qrScannerId = undefined;
        }

        if (this.qrVideo?.nativeElement) {
            this.qrVideo.nativeElement.pause();
            this.qrVideo.nativeElement.srcObject = null;
        }

        if (this.qrMediaStream) {
            this.qrMediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.qrMediaStream = undefined;
        }

        this.qrScanInProgress = false;
    }

    private qrScannerLoop(): void {
        if (!this.qrScanInProgress) {
            return;
        }

        const video = this.qrVideo?.nativeElement;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            this.qrScannerId = requestAnimationFrame(() => this.qrScannerLoop());
            return;
        }

        this.detectQrCode(video).then(rawValue => {
            if (rawValue) {
                console.log('QR code scanned:', rawValue);
                if (this.handleScannedQrText(rawValue)) {
                    this.stopQrScan();
                    return;
                }
            }
            this.qrScannerId = requestAnimationFrame(() => this.qrScannerLoop());
        }).catch(() => {
            console.log('Failed to scan QR code.');
            this.stopQrScan();
        });
    }

    private async detectQrCode(video: HTMLVideoElement): Promise<string | null> {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
            return null;
        }

        this.qrCanvas.width = width;
        this.qrCanvas.height = height;
        const context = this.qrCanvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            return null;
        }

        context.drawImage(video, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, width, height, {
            inversionAttempts: 'attemptBoth'
        });
        return code?.data || null;
    }

    private handleScannedQrText(rawValue: string): boolean {
        // TODO: Parse QR text content and map values to device attributes.
        let parts = rawValue.split(':');
        if (parts.length < 2) {
            parts = rawValue.split(';');
        }
        if (parts.length < 2) {
            return false;
        }
        const addSerial = (serial: string) => {
            if (this.displayname === undefined) {
                this.displayname = '';
            }
            if (!this.displayname.includes(serial)) {
                this.displayname += serial;
            }
        };

        if (parts[0] === 'LW' && parts[1] == 'D0' && parts.length >= 5) {
            // TR005 QR code format in Version 1.0.0 (2020)
            this.upsertAttribute('senergy/lora/join-eui', parts[2], 'web-ui');
            this.device.local_id = parts[3];
            if (parts.length >= 7) {
                // parts[4] is profileId, parts[5] is owner token
                addSerial(parts[6]);
                return true;
            }
        }
        if (parts.length === 4) {
            // used in Dragino devices
            addSerial(parts[0]);
            this.device.local_id = parts[1];
            this.upsertAttribute('senergy/lora/join-eui', parts[2], 'web-ui');
            this.upsertAttribute('senergy/lora/nwk-key', parts[3], 'web-ui');
            return true;
        }
        if (parts.length === 5) {
            // used in SenseCAP devices
            this.device.local_id = parts[0].slice(0, 16);
            addSerial(parts[4]);
            // has no key
            return true;
        }
        console.warn('Unrecognized QR code format:', rawValue);
        return false;
    }

    private upsertAttribute(key: string, value: string, origin: string): void {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        const existingAttr = this.device.attributes.find(attr => attr.key === key);
        if (existingAttr) {
            existingAttr.value = value;
            existingAttr.origin = origin;
        } else {
            this.device.attributes.push({ key, value, origin } as Attribute);
        }
    }
}

function isValidLocalId(value: string): boolean {
    if (!value) {
        return true;
    }
    return !(value.includes && (value.includes('#') || value.includes('+') || value.includes('/')));
}
