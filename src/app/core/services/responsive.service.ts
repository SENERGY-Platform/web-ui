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

import { Injectable } from '@angular/core';
import { MediaChange, MediaObserver } from '@ngbracket/ngx-layout';
import { Observable } from 'rxjs';
import {map} from 'rxjs/operators';

const mqAliases: string[] = ['xs', 'sm', 'md', 'lg', 'xl'];

@Injectable({
    providedIn: 'root',
})
export class ResponsiveService {
    constructor(private observableMedia: MediaObserver) {}

    getActiveMqAlias(): string {
        let mqAlias = '';
        for (let i = 0; i < mqAliases.length; i++) {
            if (this.observableMedia.isActive(mqAliases[i])) {
                mqAlias = mqAliases[i];
                break;
            }
        }
        return mqAlias;
    }

    observeMqAlias(): Observable<string> {
        return this.observableMedia.asObservable().pipe(map((media: MediaChange[]) => media[0].mqAlias));
    }
}
