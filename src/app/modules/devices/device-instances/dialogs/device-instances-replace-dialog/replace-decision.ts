/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OpenMeterLink } from '../../../things/shared/things.model';

/**
 * How a replacement is carried out. `swap`: the device sits in an open link on a meter thing, so the replacement is
 * one swap call of the device-repository. `legacy`: it does not, and the replacement is what it always was (rename
 * of the old device, new device, groups) with no measuring point touched. `ambiguous`: the lookup found several open
 * links, which the device-repository does not allow for one device; nothing is guessed then.
 */
export type ReplacePath = { kind: 'swap'; target: OpenMeterLink } | { kind: 'legacy' } | { kind: 'ambiguous' };

export function decideReplacePath(openLinks: OpenMeterLink[]): ReplacePath {
    if (openLinks.length === 0) {
        return { kind: 'legacy' };
    }
    return openLinks.length === 1 ? { kind: 'swap', target: openLinks[0] } : { kind: 'ambiguous' };
}

export interface ReplaceChoice {
    path: ReplacePath;
    /** The replacement is a copy of the old device (it then needs a local id of its own). */
    clone: boolean;
    /** The replacement is the old device itself: a counter reset or a changed factor. Only possible with a swap. */
    sameDevice: boolean;
}

/** The old device gets a local id of its own: a clone copies it, and local ids are unique. A legacy replacement always did. */
export function renameOldLocalId(choice: ReplaceChoice): boolean {
    if (choice.sameDevice) {
        return false;
    }
    return choice.path.kind === 'swap' ? choice.clone : true;
}

/** The old device is marked inactive unless it stays in use as the replacement. */
export function markOldInactive(choice: ReplaceChoice): boolean {
    return !choice.sameDevice;
}

/** Why the choice cannot be carried out, or null. */
export function replaceChoiceError(choice: ReplaceChoice): string | null {
    if (choice.path.kind === 'ambiguous') {
        return 'The device is linked to more than one measuring point at the moment. Resolve this on the things first.';
    }
    if (choice.sameDevice && choice.path.kind !== 'swap') {
        return 'The device is not linked to a measuring point, so it cannot replace itself. Choose another device.';
    }
    return null;
}
