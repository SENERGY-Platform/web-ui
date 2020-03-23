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

import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {MatSidenav} from '@angular/material/sidenav';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter, map, mergeMap, take} from 'rxjs/internal/operators';

import {SidenavService} from './shared/sidenav.service';
import {SidenavSectionModel} from './shared/sidenav-section.model';
import {ResponsiveService} from '../../services/responsive.service';
import {fadeInAnimation} from '../../../animations/fade-in.animation';

@Component({
    selector: 'senergy-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.css'],
    animations: [fadeInAnimation]
})

export class SidenavComponent implements OnInit, AfterViewInit {

    @ViewChild('sidenav', {static: false}) sidenav!: MatSidenav;
    mode = '';
    sections: SidenavSectionModel[] = [];
    openSection: null | string = null;
    zIndex = -1;

    constructor(private activatedRoute: ActivatedRoute,
                private router: Router,
                private sidenavService: SidenavService,
                private responsiveService: ResponsiveService) {
    }

    ngOnInit() {
        this.getActiveSection();
        this.getSections();
        this.showOrHideSidenav();
    }

    ngAfterViewInit() {
        this.sidenavChangeListener();
    }

    isSectionOpen(section: SidenavSectionModel): boolean {
        if (this.openSection === null) {
            return false;
        } else {
            return this.openSection === section.state;
        }
    }

    toggleSection(section: SidenavSectionModel): void {
        this.openSection = (this.openSection === section.state ? null : section.state);
        if (section.type === 'link') {
            this.closeSidenav();
        }
    }

    closeSidenav(): void {
        if (this.sidenav.mode === 'over') {
            this.sidenavService.toggle(false);
        }
    }

    private sidenavChangeListener(): void {
        this.sidenavService.toggleChanged.subscribe((isToggle: boolean) => {
            if (isToggle) {
                this.zIndex = 0;
            } else {
                this.zIndex = -1;
            }
            this.sidenav.toggle(isToggle);
        });
        this.sidenavService.sectionChanged.subscribe((section: SidenavSectionModel) => {
            this.openSection = section.state;
        });
    }

    private showOrHideSidenav(): void {
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            if (mqAlias === 'sm' || mqAlias === 'xs') {
                this.sidenav.close();
                this.sidenav.mode = 'over';
                this.sidenav.disableClose = false;
                this.sidenav.fixedTopGap = 0;
                this.zIndex = -1;
            } else {
                this.sidenav.mode = 'side';
                this.sidenav.open();
                this.sidenav.disableClose = true;
                this.sidenav.fixedTopGap = 64;
                this.zIndex = -1;
            }
        });
    }

    private getSections(): void {
        this.sections = this.sidenavService.getSections();
    }

    private getActiveSection() {
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => {
                return this.activatedRoute.firstChild;
            }),
            mergeMap((activatedRoute: any) => activatedRoute.url)
        ).subscribe((activeRoute: any) => this.openSection = '/'  + activeRoute[0].path);
    }
}
