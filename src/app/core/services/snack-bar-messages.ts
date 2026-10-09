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


import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

/** Success notice that dismisses itself after two seconds. */
export function snackSuccess(snackBar: MatSnackBar, message: string): MatSnackBarRef<TextOnlySnackBar> {
    return snackBar.open(message, undefined, { duration: 2000 });
}

/** Error notice that stays until the user closes it. */
export function snackError(snackBar: MatSnackBar, message: string): MatSnackBarRef<TextOnlySnackBar> {
    return snackBar.open(message, 'close', { panelClass: 'snack-bar-error' });
}
