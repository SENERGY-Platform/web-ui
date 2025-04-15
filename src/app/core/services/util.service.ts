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

import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class UtilService {
    constructor() {}

    convertSVGtoBase64(svg: string): string {
        return window.btoa(unescape(encodeURIComponent(svg)));
    }

    stringToByteArray(input: string): number[] {
        const result = [];
        for (let i = 0; i < input.length; i += 2) {
            result.push(parseInt(input.substr(i, 2), 16));
        }
        return result;
    }

    convertByteArrayToBase64(byteArray: number[]): string {
        let base64 = '';
        const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

        const bytes = new Uint8Array(byteArray);
        const byteLength = bytes.byteLength;
        const byteRemainder = byteLength % 3;
        const mainLength = byteLength - byteRemainder;

        let a;
        let b;
        let c;
        let d;
        let chunk;

        // Main loop deals with bytes in chunks of 3
        for (let i = 0; i < mainLength; i = i + 3) {
            // Combine the three bytes into a single integer
             
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
            // Use bitmasks to extract 6-bit segments from the triplet
            a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
            b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
            c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
            d = chunk & 63; // 63       = 2^6 - 1
             
            // Convert the raw binary segments to the appropriate ASCII encoding
            base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
        }

        // Deal with the remaining bytes and padding
        if (byteRemainder === 1) {
            chunk = bytes[mainLength];
             
            a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
            // Set the 4 least significant bits to zero
            b = (chunk & 3) << 4; // 3   = 2^2 - 1
             
            base64 += encodings[a] + encodings[b];
        } else if (byteRemainder === 2) {
             
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
            a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
            b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4
            // Set the 2 least significant bits to zero
            c = (chunk & 15) << 2; // 15    = 2^4 - 1
             
            base64 += encodings[a] + encodings[b] + encodings[c];
        }

        return base64;
    }


    dateIsToday(dateTime: string | number): boolean {
        const today = new Date();
        today.setHours(0,0,0,0);

        let date = new Date(dateTime);
        if(typeof(dateTime) == 'number') {
            date = new Date(dateTime);
        }
        date.setHours(0,0,0,0);
        return date.getTime() === today.getTime();
    }
}

export function hashCode(s: string): number {
    let hash = 0;
    let i = 0;
    let chr = 0;
    if (s.length === 0) {
        return hash;
    }
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
         
        hash = ((hash << 5) - hash) + chr;
         
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export async function digestMessage(message: string, algorithm = 'SHA-256'): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const hashBuffer = await window.crypto.subtle.digest(algorithm, msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''); // convert bytes to hex string
    return hashHex;
}
