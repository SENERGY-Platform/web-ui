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

/** s: confirmations, m: short forms, l: long forms and editors, xl: tables and designers. */
export type DialogSize = 's' | 'm' | 'l' | 'xl';

export const DIALOG_WIDTHS: Record<DialogSize, string> = { s: '400px', m: '600px', l: '800px', xl: '1100px' };

/** Width and max width for MatDialog.open(); the max width keeps a dialog inside narrow screens. */
export function dialogSize(size: DialogSize): { width: string; maxWidth: string } {
    return { width: DIALOG_WIDTHS[size], maxWidth: '95vw' };
}
