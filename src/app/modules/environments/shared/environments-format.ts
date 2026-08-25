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

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Human-readable byte size, base 1024. Uses integer division to pick the unit so an
 * exact power of 1024 (1024, 1048576, ...) lands on the next unit at "1", not "1024" of
 * the previous one -- rounding first and comparing after would drift at that boundary.
 */
export function formatBytes(bytes: number | undefined): string {
    if (bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
        return '0 B';
    }
    if (bytes < 1024) {
        return bytes + ' B';
    }
    let unitIndex = 0;
    let value = bytes;
    while (value >= 1024 && unitIndex < UNITS.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    const rounded = Math.round(value * 10) / 10;
    return rounded + ' ' + UNITS[unitIndex];
}
