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
import { Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthorizationService } from '../services/authorization.service';

describe('adminGuard', () => {
    let isAdmin: boolean;
    const parseUrl = jasmine.createSpy('parseUrl');
    const tree = {} as UrlTree;

    const run = () => TestBed.runInInjectionContext(() => adminGuard({} as Route, [] as UrlSegment[], {} as never));

    beforeEach(() => {
        isAdmin = true;
        parseUrl.calls.reset();
        parseUrl.and.returnValue(tree);
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthorizationService, useValue: { userIsAdmin: () => isAdmin } },
                { provide: Router, useValue: { parseUrl } },
            ],
        });
    });

    it('lets an admin match the route', () => {
        expect(run()).toBeTrue();
        expect(parseUrl).not.toHaveBeenCalled();
    });

    it('sends anyone else to the start page', () => {
        isAdmin = false;

        expect(run()).toBe(tree);
        expect(parseUrl).toHaveBeenCalledWith('/');
    });
});
