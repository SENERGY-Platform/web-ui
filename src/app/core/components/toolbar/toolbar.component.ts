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

import {Component, OnInit} from '@angular/core';
import {SidenavService} from '../sidenav/shared/sidenav.service';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter, map, mergeMap} from 'rxjs/internal/operators';
import {AuthorizationService} from '../../services/authorization.service';

@Component({
    selector: 'senergy-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {

    userName = '';
    header = '';

    constructor(private sidenavService: SidenavService,
                private router: Router,
                private activatedRoute: ActivatedRoute,
                private authorizationService: AuthorizationService) {
    }

    ngOnInit() {
        this.setHeader();
        this.initUser();

    }

    toggle(sidenavOpen: boolean): void {
        this.sidenavService.toggle(sidenavOpen);
    }

    resetSidenav(): void {
        this.sidenavService.reset();
    }

    logout(): void {

        this.authorizationService.logout();
    }

    private initUser() {
        this.userName = this.authorizationService.getUserName();
    }

    private setHeader() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => {
                let route = this.activatedRoute.firstChild;
                let child = route;
                while (child) {
                    if (child.firstChild) {
                        child = child.firstChild;
                        route = child;
                    } else {
                        child = null;
                    }
                }
                return route;
            }),
            mergeMap((route: any) => route.data)
        ).subscribe((data: any) => {
            this.header = data.header;
        });
    }

}
