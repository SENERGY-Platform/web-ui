/*
 * Copyright 2020 InfAI (CC SES)
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

import {Component, OnInit} from '@angular/core';
import {ThemingService} from './core/services/theming.service';
import {AuthorizationService} from './core/services/authorization.service';

@Component({
    selector: 'senergy-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {

    constructor(
        protected authorizationService: AuthorizationService,
        private themingService: ThemingService
    ) {
    }

    ngOnInit(): void {
        this.storeSubject();
        this.ensureCorrectSessionStorage();
        this.themingService.applyTheme();
    }

    storeSubject() {
        const sub = this.authorizationService.getUserId();
        if (typeof sub === 'string') {
            localStorage.setItem('sub', sub as string);
        }
    }

    ensureCorrectSessionStorage() {
        const sub = this.authorizationService.getUserId();
        const existingSub = sessionStorage.getItem('sub');
        if (existingSub !== null && sub !== existingSub) {
            sessionStorage.clear();
        }
        sessionStorage.setItem('sub', sub as string);
    }
}
