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

import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Observable, map } from 'rxjs';
import { DialogsService } from '../services/dialogs.service';
import { UnsavedChanges } from '../../modules/processes/designer/bpmn-js/unsaved-changes';

/** A page that knows whether it holds edits the repository does not have, such as one of the designers. */
export interface HasUnsavedChanges {
    readonly unsaved: UnsavedChanges;
}

export const UNSAVED_CHANGES_TITLE = 'Unsaved changes';
export const UNSAVED_CHANGES_TEXT = 'Leaving this page discards what was not saved. Leave anyway?';

/**
 * Asks before a page with unsaved edits is left. A dismissed question keeps the page, so a stray click cannot
 * throw the work away. It covers navigation inside the application; closing the tab is the browser's business.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component): Observable<boolean> | boolean => {
    if (component?.unsaved?.dirty !== true) {
        return true;
    }
    return inject(DialogsService)
        .openConfirmDialog(UNSAVED_CHANGES_TITLE, UNSAVED_CHANGES_TEXT)
        .afterClosed()
        .pipe(map((leave) => leave === true));
};
