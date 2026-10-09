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

import { Observable, of, Subject, throwError } from 'rxjs';
import { DashboardResponseMessageModel } from './dashboard-response-message.model';
import { saveWidgetEdits } from './save-widget-edits';

describe('saveWidgetEdits', () => {
    const ok = of<DashboardResponseMessageModel>({ message: 'OK' });
    const failed = of<DashboardResponseMessageModel>({ message: 'error update' });

    function run(requests: Observable<DashboardResponseMessageModel>[]) {
        const result = { emissions: 0, completed: false, error: undefined as unknown };
        saveWidgetEdits(requests).subscribe({
            next: () => result.emissions++,
            complete: () => (result.completed = true),
            error: (err) => (result.error = err),
        });
        return result;
    }

    it('emits once when every response is OK', () => {
        const result = run([ok, ok]);
        expect(result.emissions).toBe(1);
        expect(result.completed).toBeTrue();
    });

    it('emits nothing when one response is not OK', () => {
        const result = run([ok, failed]);
        expect(result.emissions).toBe(0);
        expect(result.completed).toBeTrue();
    });

    it('emits nothing and completes for an empty list', () => {
        const result = run([]);
        expect(result.emissions).toBe(0);
        expect(result.completed).toBeTrue();
    });

    it('waits for all requests before emitting', () => {
        const pending = new Subject<DashboardResponseMessageModel>();
        const result = run([ok, pending]);
        expect(result.emissions).toBe(0);
        pending.next({ message: 'OK' });
        pending.complete();
        expect(result.emissions).toBe(1);
    });

    it('propagates an http error and emits nothing', () => {
        const boom = new Error('boom');
        const result = run([ok, throwError(() => boom)]);
        expect(result.emissions).toBe(0);
        expect(result.error).toBe(boom);
    });
});
