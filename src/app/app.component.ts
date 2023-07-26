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

import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { forkJoin } from 'rxjs';
import { SidenavService } from './core/components/sidenav/shared/sidenav.service';
import { ThemingService } from './core/services/theming.service';

@Component({
    selector: 'senergy-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
    ready: boolean = false
    constructor(
        protected keycloak: KeycloakService, 
        private themingService: ThemingService, 
        private sidenavService: SidenavService,
    ) {}


    ngOnInit(): void {
        this.storeSubject()
        this.themingService.applyTheme();

        var obs = []
        obs.push(this.sidenavService.loadSections())

        forkJoin(obs).subscribe(results => {
            if(results.every(v => !!v)) {
                this.ready = true
            }
        })
    }

    storeSubject() {
        const sub = this.keycloak.getKeycloakInstance().subject;
        if (sub !== undefined) {
            localStorage.setItem('sub', sub);
        }
    }
}
