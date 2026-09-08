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

import { toLocalDateTimeInput, toRfc3339Seconds } from './environments-datetime';

describe('environments-datetime converters', () => {
    // Both conversions run against the same local timezone (whatever the test runner uses),
    // so a round trip holds regardless of which zone that is. A DST transition (spring-forward
    // gap or fall-back overlap) is zone- and date-dependent and deliberately not asserted here.
    it('round-trips a mid-year local datetime-local value through toRfc3339Seconds and back unchanged', () => {
        const local = '2026-07-15T14:30:00';

        const rfc = toRfc3339Seconds(local);

        expect(rfc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(toLocalDateTimeInput(rfc)).toBe(local);
    });
});
