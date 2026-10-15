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

/** A Storage whose access can be made to fail. */
export class MemoryStorage {
    data = new Map<string, string>();
    failRead = false;
    failWrite = false;
    failKeys = false;
    get length(): number {
        return this.data.size;
    }
    key(index: number): string | null {
        if (this.failRead || this.failKeys) {
            throw new Error('denied');
        }
        return [...this.data.keys()][index] ?? null;
    }
    getItem(key: string): string | null {
        if (this.failRead) {
            throw new Error('denied');
        }
        return this.data.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        if (this.failWrite) {
            throw new Error('quota');
        }
        this.data.set(key, value);
    }
    removeItem(key: string): void {
        if (this.failWrite) {
            throw new Error('quota');
        }
        this.data.delete(key);
    }
}
