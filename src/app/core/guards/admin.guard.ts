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

import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthorizationService } from '../services/authorization.service';

/** Lets only admins match a route, so its lazy module is not even loaded for anyone else; they land on the start page. */
export const adminGuard: CanMatchFn = (): boolean | UrlTree => {
    if (inject(AuthorizationService).userIsAdmin()) {
        return true;
    }
    return inject(Router).parseUrl('/');
};
