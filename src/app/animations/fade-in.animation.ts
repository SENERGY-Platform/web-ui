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

import {
    transition,
    trigger,
    query,
    style,
    group,
    animate
} from '@angular/animations';

export const fadeInAnimation = trigger('fadeInAnimation', [
    transition('* => *, :enter', [
        query(':enter, :leave', style({position: 'absolute', width: '100%'}), {optional: true}),

        group([
            query(':leave', [
                style({opacity: 0})
            ], {optional: true}),
            query(':enter', [
                style({opacity: 0}),
                animate('0.4s', style({opacity: 1}))
            ], {optional: true})
        ])
    ])

]);