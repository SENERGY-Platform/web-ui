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

/**
 * Builds a file name for a downloaded report or template preview.
 *
 * The base name is reduced to characters that are safe in a file name. The type is only appended as
 * an extension if it looks like one, because the report engine also uses descriptive type names.
 */
export function reportFileName(base: string, type?: string): string {
    const name = (base || 'report').trim().replace(/[^\w.\-]+/g, '_');
    const extension = (type || '').trim().replace(/^\./, '').toLowerCase();
    if (/^[a-z0-9]{1,5}$/.test(extension)) {
        return name + '.' + extension;
    }
    return name;
}
