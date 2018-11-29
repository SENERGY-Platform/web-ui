/*
 * Copyright 2018 InfAI (CC SES)
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

import {Injectable} from '@angular/core';


@Injectable({
    providedIn: 'root'
})

export class ElementSizeService {

    constructor() {
    }

    getHeightAndWidthByElementId(elementId: string): {'height': number, 'width': number} {
        let height = 0;
        let width = 0;
        const element = document.getElementById(elementId);

        if (element !== null) {
             height = element.offsetHeight - 1;
             width = element.offsetWidth - 1;
        } else {
            throw new Error('ElementId is unknown: ' + elementId);
        }

        return {height, width};
    }



}
