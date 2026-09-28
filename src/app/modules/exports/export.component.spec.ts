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

import { bulkDeleteOutcome } from './export.component';

describe('bulkDeleteOutcome', () => {
    it('should report a full delete as done', () => {
        expect(bulkDeleteOutcome(204, 3)).toEqual({ message: '3 exports deleted', failed: false, pending: false });
        expect(bulkDeleteOutcome(200, 1)).toEqual({ message: '1 export deleted', failed: false, pending: false });
    });

    it('should report a 207 as a partial failure', () => {
        expect(bulkDeleteOutcome(207, 3)).toEqual({ message: 'Not all exports could be deleted', failed: true, pending: false });
    });

    // The server keeps deleting after the gateway gave up, so a timeout is not a failure.
    it('should report a gateway timeout as still running, not as an error', () => {
        for (const status of [504, 0]) {
            const outcome = bulkDeleteOutcome(status, 3);
            expect(outcome.failed).toBe(false);
            expect(outcome.pending).toBe(true);
            expect(outcome.message).toContain('continues in the background');
        }
    });

    it('should report any other status as a failure', () => {
        expect(bulkDeleteOutcome(500, 2)).toEqual({ message: 'The exports could not be deleted', failed: true, pending: false });
    });
});
