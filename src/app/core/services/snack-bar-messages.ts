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

/** An error snack opened shortly before still hides a success snack and absorbs a second error text. */
export const ERROR_SNACK_WINDOW_MS = 1500;

interface OpenErrorSnack {
    ref: MatSnackBarRef<TextOnlySnackBar>;
    openedAt: number;
    /** Text of the central handler, kept after a merge so the same failure is not reported twice. */
    central?: string;
    /** Text of a component, kept so a later central text can be merged into it. */
    own?: string;
}

// MatSnackBar shows one snack at a time and open() dismisses the previous one, so the state is per instance.
const openErrors = new WeakMap<MatSnackBar, OpenErrorSnack>();

function currentError(snackBar: MatSnackBar): OpenErrorSnack | undefined {
    return openErrors.get(snackBar);
}

function withinWindow(current: OpenErrorSnack): boolean {
    return Date.now() - current.openedAt < ERROR_SNACK_WINDOW_MS;
}

function openError(
    snackBar: MatSnackBar,
    text: string,
    parts: { central?: string; own?: string },
): MatSnackBarRef<TextOnlySnackBar> {
    const ref = snackBar.open(text, 'close', { panelClass: 'snack-bar-error' });
    if (typeof ref?.afterDismissed === 'function') {
        const entry: OpenErrorSnack = { ref, openedAt: Date.now(), ...parts };
        openErrors.set(snackBar, entry);
        ref.afterDismissed().subscribe(() => {
            if (openErrors.get(snackBar) === entry) {
                openErrors.delete(snackBar);
            }
        });
    }
    return ref;
}

/** Success notice that dismisses itself after two seconds; it does not replace an error notice opened just before. */
export function snackSuccess(snackBar: MatSnackBar, message: string): MatSnackBarRef<TextOnlySnackBar> {
    const current = currentError(snackBar);
    if (current !== undefined && withinWindow(current)) {
        return current.ref;
    }
    return snackBar.open(message, undefined, { duration: 2000 });
}

/**
 * Error notice that stays until the user closes it. Right after the central handler reported the same failure it is
 * merged with that text as '<message> (<central text>)' instead of replacing it.
 */
export function snackError(snackBar: MatSnackBar, message: string): MatSnackBarRef<TextOnlySnackBar> {
    const current = currentError(snackBar);
    if (current?.central !== undefined && current.own === undefined && withinWindow(current)) {
        return openError(snackBar, message + ' (' + current.central + ')', { central: current.central, own: message });
    }
    return openError(snackBar, message, { own: message });
}

/**
 * Error notice of the central handler. The same text is not opened again while it is shown; right after a
 * component's own error notice it is appended to that text in parentheses.
 */
export function snackCentralError(snackBar: MatSnackBar, text: string): MatSnackBarRef<TextOnlySnackBar> | undefined {
    const current = currentError(snackBar);
    if (current?.central === text) {
        return undefined;
    }
    if (current?.own !== undefined && current.central === undefined && withinWindow(current)) {
        return openError(snackBar, current.own + ' (' + text + ')', { central: text, own: current.own });
    }
    return openError(snackBar, text, { central: text });
}
