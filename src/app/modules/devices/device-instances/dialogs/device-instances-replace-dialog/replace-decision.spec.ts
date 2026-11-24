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
import { decideReplacePath, markOldInactive, renameOldLocalId, replaceChoiceError } from './replace-decision';

describe('replace decision', () => {
    const open = (id: string): OpenMeterLink => ({
        thing: { id: 't' + id, name: 'n', kind: 'meter', attributes: [], content_variables: [], owner_id: 'u', device_links: [] },
        link: { id, device_id: 'd', from: '2026-01-01T00:00:00Z', until: null },
    });

    it('swaps when the device has one open link on a meter', () => {
        const target = open('l1');
        expect(decideReplacePath([target])).toEqual({ kind: 'swap', target });
    });

    it('goes the legacy way for a device on no meter thing', () => {
        expect(decideReplacePath([])).toEqual({ kind: 'legacy' });
    });

    it('does not guess among several open links', () => {
        expect(decideReplacePath([open('l1'), open('l2')])).toEqual({ kind: 'ambiguous' });
        expect(replaceChoiceError({ path: { kind: 'ambiguous' }, clone: true, sameDevice: false })).toContain('more than one');
    });

    it('renames the old local id for a clone and in the legacy way, but not for another existing device on a swap', () => {
        const swap = decideReplacePath([open('l1')]);
        expect(renameOldLocalId({ path: swap, clone: true, sameDevice: false })).toBeTrue();
        expect(renameOldLocalId({ path: swap, clone: false, sameDevice: false })).toBeFalse();
        expect(renameOldLocalId({ path: { kind: 'legacy' }, clone: false, sameDevice: false })).toBeTrue();
    });

    it('leaves the device alone that replaces itself', () => {
        const swap = decideReplacePath([open('l1')]);
        const choice = { path: swap, clone: false, sameDevice: true };
        expect(renameOldLocalId(choice)).toBeFalse();
        expect(markOldInactive(choice)).toBeFalse();
        expect(replaceChoiceError(choice)).toBeNull();
    });

    it('does not allow self-replacement without a measuring point', () => {
        expect(replaceChoiceError({ path: { kind: 'legacy' }, clone: false, sameDevice: true })).toContain('cannot replace itself');
    });
});
