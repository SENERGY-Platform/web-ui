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

import { smartServiceCompletions } from './smart-service-completions';

/*
 * Guards the adapter onto the generated ace completer. The two branches asserted
 * here -- full statements on a new statement, bare expressions inside one -- are
 * the behavior that has to survive the move from ace to monaco.
 */
describe('smartServiceCompletions', () => {
    const captionOf = (completions: { caption: string }[]) => completions.map((completion) => completion.caption);
    const valueOf = (completions: { caption: string; value: string }[], caption: string) =>
        completions.find((completion) => completion.caption === caption)?.value;

    it('offers a full statement with a result variable on an empty line', () => {
        const completions = smartServiceCompletions({ lines: [''], row: 0, column: 0 });

        expect(valueOf(completions, 'deviceRepo.getAspects')).toBe('var result_as_Aspect_list = deviceRepo.getAspects();');
    });

    it('offers a bare expression in the middle of a statement', () => {
        const completions = smartServiceCompletions({ lines: ['var x = devi'], row: 0, column: 12 });

        expect(valueOf(completions, 'deviceRepo.getAspects')).toBe('deviceRepo.getAspects()');
    });

    it('treats a line ending in a semicolon as a new statement', () => {
        const line = 'outputs.set("a", 1);';
        const completions = smartServiceCompletions({ lines: [line], row: 0, column: line.length + 1 });

        expect(valueOf(completions, 'deviceRepo.getAspects')).toBe('var result_as_Aspect_list = deviceRepo.getAspects();');
    });

    it('offers the assigning helpers only inside a statement, where they belong', () => {
        const newStatement = smartServiceCompletions({ lines: [''], row: 0, column: 0 });
        const midStatement = smartServiceCompletions({ lines: ['var x = '], row: 0, column: 8 });

        expect(captionOf(newStatement)).not.toContain('outputs.set');
        expect(captionOf(midStatement)).toContain('outputs.set');
    });

    it('returns completions instead of throwing when the cursor row is past the last line', () => {
        expect(() => smartServiceCompletions({ lines: [], row: 3, column: 0 })).not.toThrow();
        expect(smartServiceCompletions({ lines: [], row: 3, column: 0 }).length).toBeGreaterThan(0);
    });
});
