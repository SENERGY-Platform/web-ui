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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Placeholder for the environment detail/editor view. Only wires up the route
 * so "Open" from the list has a target; the actual editor is future work.
 */
@Component({
    selector: 'senergy-environment-detail',
    templateUrl: './environment-detail.component.html',
    styleUrls: ['./environment-detail.component.css'],
})
export class EnvironmentDetailComponent implements OnInit {
    id = '';

    constructor(private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
    }
}
