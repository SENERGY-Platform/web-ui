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
 * Converts a datetime-local input's value (local wall-clock time, no timezone) to RFC3339 with
 * whole seconds. Truncates rather than rounds any finer precision -- datetime-local's own
 * granularity (step="1" here, i.e. whole seconds) never produces one in practice. Shared by
 * every editor with an RFC3339-whole-seconds field (the timeline and the faults editor).
 * A local time inside a spring-forward DST gap (one that never occurs, e.g. 2:30 in a zone
 * that jumps from 2:00 to 3:00) is silently normalised by the browser's Date constructor to
 * the next valid instant rather than rejected.
 */
export function toRfc3339Seconds(localDateTime: string): string {
    return new Date(localDateTime).toISOString().slice(0, 19) + 'Z';
}

/** The inverse of toRfc3339Seconds: an RFC3339 instant to the local wall-clock string a datetime-local input expects. */
export function toLocalDateTimeInput(at: string): string {
    const date = new Date(at);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return (
        date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
    );
}
