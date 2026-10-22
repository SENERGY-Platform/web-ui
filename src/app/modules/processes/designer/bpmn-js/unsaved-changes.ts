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
 * Tells whether a bpmn-js modeler holds edits that were not saved. A save clears only the edits made
 * before it started, and an import replaces the content, so it starts clean.
 */
export class UnsavedChanges {
    private revision = 0;
    private savedRevision = 0;

    get dirty(): boolean {
        return this.revision !== this.savedRevision;
    }

    attach(modeler: { on: (event: string, callback: () => void) => void }): void {
        modeler.on('commandStack.changed', () => this.markChanged());
        modeler.on('import.done', () => {
            this.savedRevision = this.revision;
        });
    }

    /** Content that did not come from the repository, such as an uploaded file. */
    markChanged(): void {
        this.revision++;
    }

    /** Call before exporting, and pass the result to markSaved once the repository has stored it. */
    snapshot(): number {
        return this.revision;
    }

    markSaved(snapshot: number): void {
        this.savedRevision = snapshot;
    }
}
