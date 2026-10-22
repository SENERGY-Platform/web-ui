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

import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../modules/exports/shared/export.service';
import { ImportInstancesService } from '../../modules/imports/import-instances/shared/import-instances.service';
import { AutomationEngineService } from '../../core/services/automation-engine.service';
import { environment } from '../../../environments/environment';
import {
    DELETE_AFTER_UNREFERENCED_MS,
    GENERATED_RESOURCE_STORAGE,
    GeneratedResourceJanitor,
    HEARTBEAT_MS,
    PENDING_GENERATED_RESOURCES_KEY,
    PendingGeneratedResource,
    SETTLE_AFTER_MS,
    TAB_MARKER_PREFIX,
    TAB_MARKER_TTL_MS,
} from './generated-resource-janitor';
import { GeneratedResource } from './generated-resources';
import { MemoryStorage } from './memory-storage.mock';


describe('GeneratedResourceJanitor', () => {
    const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
    const MINUTE = 60 * 1000;
    let storage: MemoryStorage | null;
    let userId: string;
    let dashboards: () => Observable<unknown>;
    let exportList: () => Observable<unknown>;
    let deleted: string[];
    let deleteStatus: (id: string) => number;
    let janitor: GeneratedResourceJanitor;

    const exp = (id: string): GeneratedResource => ({ kind: 'export', id, label: 'element ' + id });
    const ins = (id: string, exportIds?: string[]): GeneratedResource => ({ kind: 'import instance', id, label: 'UBA', ...(exportIds ? { exportIds } : {}) });
    const entry = (resource: GeneratedResource, ageMs: number, over: Partial<PendingGeneratedResource> = {}): PendingGeneratedResource => ({
        userId: 'user-1',
        dashboardId: 'd1',
        widgetId: 'w1',
        resource,
        touched: NOW - ageMs,
        ...over,
    });
    // marked unreferenced by an earlier settle long enough ago, so the next settle that misses it deletes it
    const ripe = { unreferencedSince: NOW - DELETE_AFTER_UNREFERENCED_MS };
    const widget = (id: string, properties: unknown, type = 'device_status') => ({ id, type, name: 'w', properties });
    const deviceStatus = (exportIds: string[]) => widget('w1', { elements: exportIds.map((exportId) => ({ name: 'e', exportId })) });
    const dashboard = (id: string, widgets: unknown[] | null) => ({ id, name: 'd', user_id: 'user-1', refresh_time: 0, widgets });
    const answer = (...list: unknown[]) => (dashboards = () => of(list));

    const seed = (entries: unknown) => (storage as MemoryStorage).data.set(PENDING_GENERATED_RESOURCES_KEY, JSON.stringify(entries));
    const stored = (): PendingGeneratedResource[] => JSON.parse((storage as MemoryStorage).data.get(PENDING_GENERATED_RESOURCES_KEY) || '[]');
    const storedIds = () => stored().map((e) => e.resource.id);
    const markers = () => [...(storage as MemoryStorage).data.keys()].filter((k) => k.startsWith(TAB_MARKER_PREFIX));
    const otherTab = (at: unknown, tab = 'other-tab') => (storage as MemoryStorage).data.set(TAB_MARKER_PREFIX + tab, String(at));
    const getDashboards = () => TestBed.inject(DashboardService).getDashboards as jasmine.Spy;
    const getAllExports = () => TestBed.inject(ExportService).getAllExportsQuietly as jasmine.Spy;
    const reads = (id: string, filter: string) => ({ ID: id, FilterType: 'import_id', Filter: filter });
    const status = (id: string) => {
        deleted.push(id);
        const s = deleteStatus(id);
        return of({ status: s });
    };

    /** `realEngine` keeps the AutomationEngineService itself, so its requests reach the HttpTestingController. */
    function configure(realEngine = false): void {
        const engine = {
            provide: AutomationEngineService,
            useValue: {
                deleteDeploymentIfExists: jasmine.createSpy('deleteDeploymentIfExists').and.callFake(status),
                deleteScheduleIfExists: jasmine.createSpy('deleteScheduleIfExists').and.callFake(status),
            },
        };
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: GENERATED_RESOURCE_STORAGE, useFactory: () => storage },
                {
                    provide: AuthorizationService,
                    useValue: {
                        getUserId: () => {
                            if (userId === 'throw') {
                                throw new Error('no auth client');
                            }
                            return userId;
                        },
                    },
                },
                { provide: DashboardService, useValue: { getDashboards: jasmine.createSpy('getDashboards').and.callFake(() => dashboards()) } },
                {
                    provide: ExportService,
                    useValue: {
                        stopPipelineByIdIfExists: jasmine.createSpy().and.callFake(status),
                        getAllExportsQuietly: jasmine.createSpy('getAllExportsQuietly').and.callFake(() => exportList()),
                    },
                },
                ...(realEngine ? [] : [engine]),
                {
                    provide: ImportInstancesService,
                    useValue: {
                        deleteImportInstance: jasmine.createSpy().and.callFake((id: string) => {
                            deleted.push(id);
                            const s = deleteStatus(id);
                            return s >= 400 ? throwError(() => ({ status: s })) : of(undefined);
                        }),
                    },
                },
            ],
        });
        janitor = TestBed.inject(GeneratedResourceJanitor);
    }

    beforeEach(() => {
        storage = new MemoryStorage();
        userId = 'user-1';
        answer(dashboard('d1', [deviceStatus([])]));
        // the export service omits empty fields
        exportList = () => of({});
        deleted = [];
        deleteStatus = () => 204;
    });

    describe('with a fixed clock', () => {
        beforeEach(() => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(NOW));
            configure();
        });

        afterEach(() => jasmine.clock().uninstall());

        it('logs an added resource with user, dashboard, widget and time', () => {
            const ok = janitor.session('d1', 'w1').add([exp('e1')]);

            expect(ok).toBeTrue();
            expect(stored()).toEqual([entry(exp('e1'), 0)]);
        });

        it('refreshes the entries of its own widget when a dialog session is created, and leaves other widgets alone', () => {
            seed([entry(exp('old'), 20 * MINUTE, ripe), entry(exp('other'), 20 * MINUTE, { widgetId: 'w2', ...ripe })]);

            janitor.session('d1', 'w1');

            expect(stored().map((e) => [e.resource.id, NOW - e.touched, e.unreferencedSince])).toEqual([
                ['old', 0, undefined],
                ['other', 20 * MINUTE, ripe.unreferencedSince],
            ]);
        });

        it('refreshes all entries of the dialog when it adds one, and leaves other widgets alone', () => {
            seed([entry(exp('old'), 20 * MINUTE), entry(exp('other'), 20 * MINUTE, { widgetId: 'w2' })]);
            const session = janitor.session('d1', 'w1');
            jasmine.clock().mockDate(new Date(NOW + 5 * MINUTE));

            session.add([exp('e1')]);

            expect(stored().map((e) => [e.resource.id, NOW + 5 * MINUTE - e.touched])).toEqual([['old', 0], ['other', 25 * MINUTE], ['e1', 0]]);
        });

        it('removes only the given resources of its own widget', () => {
            seed([entry(exp('e1'), 0), entry(exp('e2'), 0), entry(exp('e1'), 0, { widgetId: 'w2' })]);

            janitor.session('d1', 'w1').remove([exp('e1')]);

            expect(stored().map((e) => e.widgetId + ':' + e.resource.id)).toEqual(['w1:e2', 'w2:e1']);
        });

        it('deletes a marked entry no stored widget references and drops it, reading the dashboards quietly past the cache', () => {
            seed([entry(exp('orphan'), SETTLE_AFTER_MS, ripe)]);
            answer(dashboard('d1', [deviceStatus(['used'])]));

            janitor.settle();

            expect(getDashboards()).toHaveBeenCalledOnceWith({ quiet: true, bypassCache: true });
            expect(deleted).toEqual(['orphan']);
            expect(stored()).toEqual([]);
        });

        it('deletes the unreferenced entries of a widget that no longer exists', () => {
            seed([entry(exp('orphan'), SETTLE_AFTER_MS, { widgetId: 'gone', ...ripe })]);
            answer(dashboard('d1', [deviceStatus([])]), dashboard('d2', null));

            janitor.settle();

            expect(deleted).toEqual(['orphan']);
            expect(stored()).toEqual([]);
        });

        it('drops an entry its own widget references without deleting it', () => {
            seed([entry(exp('used'), SETTLE_AFTER_MS), entry({ kind: 'schedule', id: 's1', label: 'x' }, SETTLE_AFTER_MS)]);
            answer(dashboard('d1', [widget('w1', { elements: [{ name: 'e', exportId: 'used', scheduleId: 's1' }] })]));

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(stored()).toEqual([]);
        });

        it('keeps a resource another widget on another dashboard references', () => {
            seed([
                entry(ins('adopted'), SETTLE_AFTER_MS, ripe),
                entry(exp('orphan'), SETTLE_AFTER_MS, ripe),
            ]);
            answer(dashboard('d1', [deviceStatus([])]), dashboard('d2', [widget('w9', { ubaInfo: { importInstanceId: 'adopted' } }, 'air_quality')]));

            janitor.settle();

            expect(deleted).toEqual(['orphan']);
            expect(stored()).toEqual([]);
        });

        it('finds an id deep inside nested properties of any widget type', () => {
            seed([entry(exp('deep'), SETTLE_AFTER_MS)]);
            answer(dashboard('d1', [widget('w5', { a: [{ b: { c: [1, null, ['x', { d: 'deep' }]] } }] }, 'some_future_widget')]));

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(stored()).toEqual([]);
        });

        it('counts an id embedded in a longer string as referenced', () => {
            seed([entry(exp('embedded'), SETTLE_AFTER_MS)]);
            answer(dashboard('d1', [widget('w5', { query: '/exports/embedded/values' })]));

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(stored()).toEqual([]);
        });

        it('counts an id used as a property key as referenced', () => {
            seed([entry(exp('keyed'), SETTLE_AFTER_MS)]);
            answer(dashboard('d1', [widget('w5', { colors: { keyed: 'red' } })]));

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(stored()).toEqual([]);
        });

        it('settles an entry written before that still carries a widget type', () => {
            seed([{ ...entry(exp('e1'), SETTLE_AFTER_MS, ripe), widgetType: 'chart' }]);

            janitor.settle();

            expect(deleted).toEqual(['e1']);
            expect(stored()).toEqual([]);
        });

        it('drops an entry whose delete answers 404 and keeps one whose delete fails', () => {
            seed([entry(exp('gone'), SETTLE_AFTER_MS, ripe), entry(exp('bad'), SETTLE_AFTER_MS, ripe)]);
            deleteStatus = (id) => (id === 'gone' ? 404 : 502);
            spyOn(console, 'warn');

            janitor.settle();

            expect(deleted).toEqual(['gone', 'bad']);
            expect(storedIds()).toEqual(['bad']);
        });

        it('keeps everything when the dashboards read fails, which answers null', () => {
            seed([entry(exp('e1'), SETTLE_AFTER_MS), entry(exp('e2'), SETTLE_AFTER_MS, ripe)]);
            dashboards = () => of(null);

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(stored()).toEqual([entry(exp('e1'), SETTLE_AFTER_MS), entry(exp('e2'), SETTLE_AFTER_MS, ripe)]);
        });

        it('marks and deletes unreferenced entries of a user without dashboards', () => {
            seed([entry(exp('fresh'), SETTLE_AFTER_MS), entry(exp('old'), SETTLE_AFTER_MS, ripe), entry(ins('i1'), SETTLE_AFTER_MS, ripe)]);
            answer();

            janitor.settle();

            expect(getDashboards()).toHaveBeenCalledTimes(2);
            expect(deleted).toEqual(['old', 'i1']);
            expect(stored()).toEqual([entry(exp('fresh'), SETTLE_AFTER_MS, { unreferencedSince: NOW })]);
        });

        it('keeps everything when the second dashboards read of a settle fails', () => {
            seed([entry(ins('i1'), SETTLE_AFTER_MS, ripe)]);
            const answers: unknown[] = [[], null];
            dashboards = () => of(answers.shift());

            janitor.settle();

            expect(getDashboards()).toHaveBeenCalledTimes(2);
            expect(deleted).toEqual([]);
            expect(storedIds()).toEqual(['i1']);
        });

        it('keeps everything when reading the dashboards throws, and settles on the next call', () => {
            seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
            dashboards = () => {
                throw new Error('corrupt cache');
            };
            spyOn(console, 'warn');

            expect(() => janitor.settle()).not.toThrow();
            expect(storedIds()).toEqual(['e1']);

            answer(dashboard('d1', [deviceStatus([])]));
            janitor.settle();
            expect(deleted).toEqual(['e1']);
        });

        it('keeps everything when the answer is not shaped like a dashboard list', () => {
            seed([entry(exp('e1'), SETTLE_AFTER_MS)]);
            const malformed: unknown[] = [{}, 'x', [null], [{ id: 'd1' }], [{ id: 'd1', widgets: 'x' }], [{ id: 'd1', widgets: ['x'] }], [{ id: 'd1', widgets: [null] }]];

            malformed.forEach((m) => {
                dashboards = () => of(m);
                janitor.settle();
            });

            expect(getDashboards()).toHaveBeenCalledTimes(malformed.length);
            expect(deleted).toEqual([]);
            expect(storedIds()).toEqual(['e1']);
        });

        it('leaves entries touched less than 24 hours ago alone', () => {
            expect(SETTLE_AFTER_MS).toBe(24 * 60 * MINUTE);
            seed([entry(exp('young'), SETTLE_AFTER_MS - 1, ripe)]);

            janitor.settle();
            expect(getDashboards()).not.toHaveBeenCalled();
            expect(storedIds()).toEqual(['young']);

            jasmine.clock().mockDate(new Date(NOW + 1));
            janitor.settle();
            expect(deleted).toEqual(['young']);
        });

        it('leaves the entries of another user alone', () => {
            seed([entry(exp('theirs'), SETTLE_AFTER_MS, { userId: 'user-2' })]);

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(storedIds()).toEqual(['theirs']);
        });

        it('does nothing without a user id', () => {
            userId = '';
            seed([entry(exp('e1'), SETTLE_AFTER_MS)]);

            const session = janitor.session('d1', 'w1');
            expect(session.add([exp('e2')])).toBeFalse();
            expect(session.isPending('export', 'e1')).toBeFalse();
            janitor.settle();

            expect(deleted).toEqual([]);
            expect(storedIds()).toEqual(['e1']);
        });

        it('does nothing when the user id cannot be read', () => {
            userId = 'throw';
            seed([entry(exp('e1'), SETTLE_AFTER_MS, { userId: 'throw' })]);

            expect(janitor.session('d1', 'w1').add([exp('e2')])).toBeFalse();
            janitor.settle();

            expect(deleted).toEqual([]);
            expect(storedIds()).toEqual(['e1']);
        });

        it('leaves the entries of a widget whose dialog is open in this tab, and settles them once it is released', () => {
            seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
            const session = janitor.session('d1', 'w1');
            jasmine.clock().mockDate(new Date(NOW + SETTLE_AFTER_MS));

            janitor.settle();
            expect(getDashboards()).not.toHaveBeenCalled();

            // opening the dialog touched the entry and so cleared its mark
            session.release();
            expect(deleted).toEqual([]);
            expect(stored()[0].unreferencedSince).toBe(NOW + SETTLE_AFTER_MS);

            jasmine.clock().mockDate(new Date(NOW + SETTLE_AFTER_MS + DELETE_AFTER_UNREFERENCED_MS));
            janitor.settle();
            expect(deleted).toEqual(['e1']);
        });

        it('settles nothing while a dialog of another widget is open in this tab', () => {
            seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
            const session = janitor.session('d1', 'other');

            janitor.settle();
            expect(getDashboards()).not.toHaveBeenCalled();
            expect(deleted).toEqual([]);

            session.release();
            expect(deleted).toEqual(['e1']);
        });

        it('does not delete an entry another tab refreshed while the dashboards were loading', () => {
            seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
            const loading = new Subject<unknown>();
            dashboards = () => loading;

            janitor.settle();
            seed([entry(exp('e1'), 0)]);
            loading.next([dashboard('d1', [deviceStatus([])])]);
            loading.complete();

            expect(deleted).toEqual([]);
            expect(storedIds()).toEqual(['e1']);
        });

        describe('pending entries and linked exports', () => {
            it('tells whether a resource is pending for the user by kind and id, whichever widget logged it', () => {
                seed([entry(exp('e1'), 0, { dashboardId: 'd9', widgetId: 'w9' }), entry(exp('theirs'), 0, { userId: 'user-2' })]);
                const session = janitor.session('d1', 'w1');

                expect(session.isPending('export', 'e1')).toBeTrue();
                expect(session.isPending('import instance', 'e1')).toBeFalse();
                expect(session.isPending('export', 'theirs')).toBeFalse();
                expect(session.isPending('export', 'unknown')).toBeFalse();
            });

            it('links an export to every pending entry of the user for the import instance, clears its mark and creates none', () => {
                seed([
                    entry(ins('i1'), SETTLE_AFTER_MS, { widgetId: 'w9', ...ripe }),
                    entry(ins('i1', ['x1']), 0),
                    entry(ins('i1'), 0, { userId: 'user-2' }),
                    entry(exp('i1'), 0),
                ]);
                const session = janitor.session('d1', 'w2');

                session.link('i1', 'x2');
                session.link('i2', 'x2');

                expect(stored().map((e) => [e.userId, e.widgetId, e.resource.kind, e.resource.exportIds, e.unreferencedSince])).toEqual([
                    ['user-1', 'w9', 'import instance', ['x2'], undefined],
                    ['user-1', 'w1', 'import instance', ['x1', 'x2'], undefined],
                    ['user-2', 'w1', 'import instance', undefined, undefined],
                    ['user-1', 'w1', 'export', undefined, undefined],
                ]);
            });

            it('keeps the linked exports of an import instance that is added again, and stores links only on import instances', () => {
                const session = janitor.session('d1', 'w1');
                session.add([ins('i1'), { ...exp('e1'), exportIds: ['x0'] }]);
                session.link('i1', 'x1');

                session.add([ins('i1', ['x2'])]);

                expect(stored().map((e) => [e.resource.id, e.resource.exportIds])).toEqual([
                    ['i1', ['x2', 'x1']],
                    ['e1', undefined],
                ]);
            });

            it('drops an import instance without deleting it while a widget references an export linked to it', () => {
                seed([entry(ins('i1', ['x1']), SETTLE_AFTER_MS, ripe), entry(exp('x1'), SETTLE_AFTER_MS, ripe)]);
                answer(dashboard('d1', [widget('w5', { exportId: 'x1' }, 'chart')]));

                janitor.settle();

                expect(getAllExports()).not.toHaveBeenCalled();
                expect(deleted).toEqual([]);
                expect(stored()).toEqual([]);
            });

            it('deletes an import instance when neither it nor its linked exports are referenced', () => {
                seed([entry(ins('i1', ['x1']), SETTLE_AFTER_MS, ripe)]);

                janitor.settle();

                expect(deleted).toEqual(['i1']);
            });

            it('drops an import instance without links while a widget references an export the live list shows reading from it', () => {
                seed([entry(ins('i1'), SETTLE_AFTER_MS, ripe), entry(ins('i2'), SETTLE_AFTER_MS, ripe)]);
                exportList = () => of({ instances: [reads('x0', 'other'), reads('x1', 'i1'), reads('x2', 'i1')], total: 3 });
                answer(dashboard('d1', [widget('w5', { exportId: 'x2' }, 'chart')]));

                janitor.settle();

                expect(getAllExports()).toHaveBeenCalledTimes(1);
                expect(deleted).toEqual(['i2']);
                expect(stored()).toEqual([]);
            });

            it('deletes an import instance when no export the live list shows reading from it is referenced', () => {
                seed([entry(ins('i1'), SETTLE_AFTER_MS, ripe)]);
                exportList = () => of({ instances: [reads('x1', 'i1')], total: 1 });
                answer(dashboard('d1', [widget('w5', { exportId: 'x9' }, 'chart')]));

                janitor.settle();

                expect(deleted).toEqual(['i1']);
            });

            it('neither marks nor deletes an import instance when the export list cannot be loaded, and settles the other kinds', () => {
                const unusable: unknown[] = [
                    null,
                    [],
                    'x',
                    { instances: 'x' },
                    { instances: [null] },
                    { instances: [{ Filter: 'i1' }] },
                    { instances: [reads('x1', 'i1')], total: 2 },
                    { instances: [], total: 'x' },
                ];
                unusable.forEach((list) => {
                    const before = [entry(ins('i1'), SETTLE_AFTER_MS, ripe), entry(ins('i2'), SETTLE_AFTER_MS), entry(exp('e1'), SETTLE_AFTER_MS, ripe)];
                    seed(before);
                    exportList = () => of(list);

                    janitor.settle();

                    expect(stored()).withContext(JSON.stringify(list)).toEqual(before.slice(0, 2));
                });
                expect(deleted).toEqual(unusable.map(() => 'e1'));
            });

            it('neither marks nor deletes an import instance when loading the export list throws', () => {
                seed([entry(ins('i1'), SETTLE_AFTER_MS, ripe), entry(ins('i2'), SETTLE_AFTER_MS)]);
                exportList = () => throwError(() => new Error('500'));
                spyOn(console, 'warn');

                janitor.settle();

                expect(deleted).toEqual([]);
                expect(stored()).toEqual([entry(ins('i1'), SETTLE_AFTER_MS, ripe), entry(ins('i2'), SETTLE_AFTER_MS)]);
            });

            it('deletes nothing when a dialog opened in another tab while the export list was loading', () => {
                seed([entry(ins('i1'), SETTLE_AFTER_MS, ripe)]);
                const loading = new Subject<unknown>();
                exportList = () => loading;

                janitor.settle();
                otherTab(NOW);
                loading.next({});
                loading.complete();

                expect(deleted).toEqual([]);
                expect(storedIds()).toEqual(['i1']);
            });

            it('keeps what a widget saved while the export list was loading references, reading the dashboards again after it', () => {
                seed([entry(ins('i1'), SETTLE_AFTER_MS, ripe), entry(exp('e1'), SETTLE_AFTER_MS, ripe), entry(exp('e2'), SETTLE_AFTER_MS, ripe)]);
                const loading = new Subject<unknown>();
                exportList = () => loading;

                janitor.settle();
                answer(dashboard('d1', [widget('w5', { importId: 'i1', exportId: 'e1' }, 'chart')]));
                loading.next({});
                loading.complete();

                expect(getDashboards().calls.allArgs()).toEqual([[{ quiet: true, bypassCache: true }], [{ quiet: true, bypassCache: true }]]);
                expect(deleted).toEqual(['e2']);
                expect(stored()).toEqual([]);
            });

            it('keeps everything when the dashboards read after the export list fails or is malformed', () => {
                const before = [entry(ins('i1'), SETTLE_AFTER_MS, ripe), entry(exp('e1'), SETTLE_AFTER_MS, ripe)];
                spyOn(console, 'warn');
                const failedReads: (() => Observable<unknown>)[] = [() => of(null), () => of([null]), () => throwError(() => new Error('500'))];
                failedReads.forEach((second) => {
                    seed(before);
                    const loading = new Subject<unknown>();
                    exportList = () => loading;

                    janitor.settle();
                    dashboards = second;
                    loading.next({});
                    loading.complete();

                    expect(deleted).toEqual([]);
                    expect(stored()).toEqual(before);
                    answer(dashboard('d1', [deviceStatus([])]));
                });
                expect(getDashboards()).toHaveBeenCalledTimes(6);
            });
        });

        describe('two observations before a delete', () => {
            it('only marks an entry at the first settle that finds it unreferenced', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS)]);

                janitor.settle();

                expect(deleted).toEqual([]);
                expect(stored()).toEqual([entry(exp('e1'), SETTLE_AFTER_MS, { unreferencedSince: NOW })]);
            });

            it('does not delete at a second settle less than 10 minutes after the mark', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS)]);
                janitor.settle();

                jasmine.clock().mockDate(new Date(NOW + DELETE_AFTER_UNREFERENCED_MS - 1));
                janitor.settle();

                expect(deleted).toEqual([]);
                expect(stored()[0].unreferencedSince).toBe(NOW);
            });

            it('deletes at a settle 10 minutes after the mark that again finds it unreferenced', () => {
                expect(DELETE_AFTER_UNREFERENCED_MS).toBe(10 * MINUTE);
                seed([entry(exp('e1'), SETTLE_AFTER_MS)]);
                janitor.settle();

                jasmine.clock().mockDate(new Date(NOW + DELETE_AFTER_UNREFERENCED_MS));
                janitor.settle();

                expect(deleted).toEqual(['e1']);
                expect(stored()).toEqual([]);
            });

            it('drops a marked entry without deleting it when the second settle finds it referenced', () => {
                seed([entry(exp('moved'), SETTLE_AFTER_MS)]);
                answer(dashboard('d1', [deviceStatus([])]));
                janitor.settle();
                expect(stored()[0].unreferencedSince).toBe(NOW);

                jasmine.clock().mockDate(new Date(NOW + DELETE_AFTER_UNREFERENCED_MS));
                answer(dashboard('d2', [deviceStatus(['moved'])]));
                janitor.settle();

                expect(deleted).toEqual([]);
                expect(stored()).toEqual([]);
            });

            it('treats a malformed or future mark as unmarked and marks it anew', () => {
                const marks: unknown[] = ['x', null, Infinity, NOW + 1];
                seed(marks.map((m, i) => ({ ...entry(exp('e' + i), SETTLE_AFTER_MS), unreferencedSince: m })));

                janitor.settle();

                expect(deleted).toEqual([]);
                expect(stored().map((e) => e.unreferencedSince)).toEqual([NOW, NOW, NOW, NOW]);
            });

            it('uses a mark another tab placed while the dashboards were loading', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS)]);
                const loading = new Subject<unknown>();
                dashboards = () => loading;

                janitor.settle();
                seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
                loading.next([dashboard('d1', [deviceStatus([])])]);
                loading.complete();

                expect(deleted).toEqual(['e1']);
                expect(stored()).toEqual([]);
            });
        });

        describe('dialogs open in other tabs', () => {
            it('settles nothing while another tab has a fresh marker', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
                otherTab(NOW - TAB_MARKER_TTL_MS + 1);

                janitor.settle();

                expect(getDashboards()).not.toHaveBeenCalled();
                expect(storedIds()).toEqual(['e1']);
                expect(markers()).toEqual([TAB_MARKER_PREFIX + 'other-tab']);
            });

            it('settles nothing when a dialog opened in another tab while the dashboards were loading', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
                const loading = new Subject<unknown>();
                dashboards = () => loading;

                janitor.settle();
                otherTab(NOW);
                loading.next([dashboard('d1', [deviceStatus([])])]);
                loading.complete();

                expect(deleted).toEqual([]);
                expect(stored()).toEqual([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
            });

            it('ignores and removes stale, future and malformed markers', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
                otherTab(NOW - TAB_MARKER_TTL_MS, 'stale');
                otherTab(NOW + TAB_MARKER_TTL_MS, 'future');
                otherTab('', 'empty');
                otherTab('soon', 'malformed');

                janitor.settle();

                expect(deleted).toEqual(['e1']);
                expect(markers()).toEqual([]);
            });

            it('settles nothing when the markers cannot be listed', () => {
                seed([entry(exp('e1'), SETTLE_AFTER_MS, ripe)]);
                (storage as MemoryStorage).failKeys = true;

                janitor.settle();

                expect(getDashboards()).not.toHaveBeenCalled();
                expect(storedIds()).toEqual(['e1']);
            });

            it('keeps a marker of this tab while any of its dialogs is open, and removes it when the last one closes', () => {
                const first = janitor.session('d1', 'w1');
                const own = markers();
                expect(own.length).toBe(1);
                expect((storage as MemoryStorage).data.get(own[0])).toBe(String(NOW));
                const second = janitor.session('d1', 'w2');

                first.release();
                expect(markers()).toEqual(own);

                second.release();
                expect(markers()).toEqual([]);
            });
        });

        it('ignores unreadable stored content and malformed entries', () => {
            (storage as MemoryStorage).data.set(PENDING_GENERATED_RESOURCES_KEY, '{not json');
            const session = janitor.session('d1', 'w1');
            expect(session.add([exp('e1')])).toBeTrue();
            session.release();
            seed([
                ...stored(),
                { userId: 'user-1' },
                entry({ kind: 'other' as never, id: 'x', label: '' }, SETTLE_AFTER_MS),
                entry({ ...ins('i1'), exportIds: [5 as never] }, SETTLE_AFTER_MS, ripe),
                entry({ ...ins('i2'), exportIds: 'zz' as never }, SETTLE_AFTER_MS, ripe),
            ]);
            jasmine.clock().mockDate(new Date(NOW + SETTLE_AFTER_MS));
            answer(dashboard('d1', [deviceStatus(['e1'])]));

            janitor.settle();

            expect(deleted).toEqual([]);
            expect(stored()).toEqual([]);
        });

        it('deletes a ripe deployment and schedule quietly through the automation-engine', () => {
            seed([
                entry({ kind: 'process deployment', id: 'dep-1', label: 'x' }, SETTLE_AFTER_MS, ripe),
                entry({ kind: 'schedule', id: 'sched-1', label: 'x' }, SETTLE_AFTER_MS, ripe),
            ]);

            janitor.settle();

            const engine = TestBed.inject(AutomationEngineService);
            expect(engine.deleteDeploymentIfExists).toHaveBeenCalledOnceWith('dep-1', true);
            expect(engine.deleteScheduleIfExists).toHaveBeenCalledOnceWith('sched-1', true);
            expect(stored()).toEqual([]);
        });
    });

    describe('with the automation-engine API', () => {
        beforeEach(() => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(NOW));
            configure(true);
        });

        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
            jasmine.clock().uninstall();
        });

        it('sends the deletes to the processes namespace, drops what is gone and keeps what failed', () => {
            seed([
                entry({ kind: 'process deployment', id: 'dep-1', label: 'x' }, SETTLE_AFTER_MS, ripe),
                entry({ kind: 'schedule', id: 'sched-1', label: 'x' }, SETTLE_AFTER_MS, ripe),
            ]);
            spyOn(console, 'warn');
            spyOn(console, 'error');

            janitor.settle();

            const http = TestBed.inject(HttpTestingController);
            const base = environment.automationEngineUrl + '/namespaces/processes';
            const deployment = http.expectOne(base + '/deployments/dep-1');
            const schedule = http.expectOne(base + '/schedules/sched-1');
            expect([deployment.request.method, schedule.request.method]).toEqual(['DELETE', 'DELETE']);
            deployment.flush('not found', { status: 404, statusText: 'Not Found' });
            schedule.flush('down', { status: 502, statusText: 'Bad Gateway' });

            expect(storedIds()).toEqual(['sched-1']);
        });
    });

    describe('when the storage is unavailable', () => {
        it('logs nothing and settles nothing without a storage', () => {
            storage = null;
            configure();

            const session = janitor.session('d1', 'w1');

            expect(session.add([exp('e1')])).toBeFalse();
            expect(() => session.remove([exp('e1')])).not.toThrow();
            expect(() => session.touch()).not.toThrow();
            session.release();
            expect(() => janitor.settle()).not.toThrow();
            expect(getDashboards()).not.toHaveBeenCalled();
        });

        it('answers false and does not throw when reading or writing fails', () => {
            configure();
            const session = janitor.session('d1', 'w1');
            (storage as MemoryStorage).failWrite = true;
            expect(session.add([exp('e1')])).toBeFalse();

            (storage as MemoryStorage).failWrite = false;
            (storage as MemoryStorage).failRead = true;
            expect(session.add([exp('e1')])).toBeFalse();
            expect(() => janitor.settle()).not.toThrow();
            expect((storage as MemoryStorage).data.has(PENDING_GENERATED_RESOURCES_KEY)).toBeFalse();
        });
    });

    describe('heartbeat', () => {
        beforeEach(() => configure());

        it('settles at start and sets up the heartbeat and the page listeners only once', fakeAsync(() => {
            seed([{ ...entry(exp('e1'), 0), touched: Date.now() - SETTLE_AFTER_MS, unreferencedSince: Date.now() - DELETE_AFTER_UNREFERENCED_MS }]);
            const interval = spyOn(window, 'setInterval').and.callThrough();
            const listen = spyOn(window, 'addEventListener').and.callThrough();

            janitor.start();
            expect(deleted).toEqual(['e1']);
            janitor.start();

            expect(getDashboards()).toHaveBeenCalledTimes(1);
            expect(interval).toHaveBeenCalledTimes(1);
            expect(listen.calls.allArgs().map((a) => a[0])).toEqual(['pagehide', 'pageshow']);
            discardPeriodicTasks();
        }));

        it('keeps the entries of an open dialog fresh for other tabs once started', fakeAsync(() => {
            const session = janitor.session('d1', 'w1');
            session.add([exp('e1')]);
            const added = stored()[0].touched;
            janitor.start();

            tick(HEARTBEAT_MS);

            expect(stored()[0].touched).toBe(added + HEARTBEAT_MS);
            session.release();
            tick(HEARTBEAT_MS);
            expect(stored()[0].touched).toBe(added + HEARTBEAT_MS);
            discardPeriodicTasks();
        }));

        it('rewrites the marker of this tab on each beat while a dialog is open', fakeAsync(() => {
            const session = janitor.session('d1', 'w1');
            const key = markers()[0];
            const opened = Number((storage as MemoryStorage).data.get(key));
            janitor.start();

            tick(HEARTBEAT_MS);

            expect(Number((storage as MemoryStorage).data.get(key))).toBe(opened + HEARTBEAT_MS);
            session.release();
            discardPeriodicTasks();
        }));

        it('removes the marker of this tab on pagehide and restores it on pageshow while a dialog is open', fakeAsync(() => {
            const session = janitor.session('d1', 'w1');
            const key = markers()[0];
            janitor.start();

            window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
            expect(markers()).toEqual([]);

            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
            expect(markers()).toEqual([key]);
            session.release();
            discardPeriodicTasks();
        }));
    });
});
