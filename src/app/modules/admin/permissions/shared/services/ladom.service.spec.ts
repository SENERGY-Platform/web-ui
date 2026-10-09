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


import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { LadonService } from './ladom.service';
import { PermissionModel } from '../permission.model';

describe('LadonService policy writes', () => {
    let service: LadonService;
    let http: HttpTestingController;
    let snackBar: jasmine.SpyObj<MatSnackBar>;

    const policy = { id: 'p1', subject: 's', resource: '/r', actions: ['GET'] } as PermissionModel;
    const calls: { name: string; method: string; call: () => Observable<boolean> }[] = [
        { name: 'postPolicies', method: 'POST', call: () => service.postPolicies([policy]) },
        { name: 'putPolicies', method: 'PUT', call: () => service.putPolicies([policy]) },
        { name: 'deletePolicies', method: 'DELETE', call: () => service.deletePolicies([policy]) },
    ];

    beforeEach(() => {
        spyOn(console, 'error');
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatSnackBar, useValue: snackBar }],
        });
        service = TestBed.inject(LadonService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    for (const c of calls) {
        it(c.name + ' answers false and names the backend when the request fails', () => {
            let result: boolean | undefined;
            c.call().subscribe((r) => result = r);
            http.expectOne((r) => r.method === c.method).flush('denied', { status: 500, statusText: 'Internal Server Error' });

            expect(result).toBeFalse();
            expect(snackBar.open.calls.mostRecent().args[0]).toContain('request failed (500)');
        });

        it(c.name + ' answers true without a snack bar when the request succeeds', () => {
            let result: boolean | undefined;
            c.call().subscribe((r) => result = r);
            http.expectOne((r) => r.method === c.method).flush(null);

            expect(result).toBeTrue();
            expect(snackBar.open).not.toHaveBeenCalled();
        });
    }
});
