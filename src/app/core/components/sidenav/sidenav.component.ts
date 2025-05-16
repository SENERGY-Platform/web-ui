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

import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

import { SidenavService } from './shared/sidenav.service';
import { SidenavSectionModel } from './shared/sidenav-section.model';
import { ResponsiveService } from '../../services/responsive.service';
import { fadeInAnimation } from '../../../animations/fade-in.animation';

@Component({
    selector: 'senergy-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.css'],
    animations: [fadeInAnimation],
})
export class SidenavComponent implements OnInit, AfterViewInit {
    @ViewChild('sidenav', { static: false }) sidenav!: MatSidenav;
    mode = '';
    sections: SidenavSectionModel[] = [];
    openSection: null | string = null;
    zIndex = -1;

    get shouldStartOpen(): boolean {
        return JSON.parse(sessionStorage.getItem('SidenavComponent/shouldStartOpen') || 'true');
    }

    set shouldStartOpen(b: boolean) {
        if (!b) {
            sessionStorage.setItem('SidenavComponent/shouldStartOpen', 'false');
        } else {
            sessionStorage.removeItem('SidenavComponent/shouldStartOpen');
        }
    }

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private sidenavService: SidenavService,
        private responsiveService: ResponsiveService,
        private cd: ChangeDetectorRef,
    ) {
    }

    ngOnInit() {
        this.getActiveSection();
        this.showOrHideSidenav();
        this.sections = this.sidenavService.loadSections();
    }

    ngAfterViewInit() {
        this.sidenav.mode = 'side';
        this.sidenavChangeListener();
        this.sidenavService.toggle(this.shouldStartOpen);
    }

    isSectionOpen(section: SidenavSectionModel): boolean {
        if (this.openSection === null) {
            return false;
        } else {
            return this.openSection === section.state;
        }
    }

    toggleSection(section: SidenavSectionModel): void {
        this.openSection = this.openSection === section.state ? null : section.state;
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
        this.sidenavService.toggleChanged.subscribe((state: boolean) => {
            this.shouldStartOpen = this.sidenav.mode !== 'side' || state;
            if (state) {
                this.zIndex = 0;
            } else {
                this.zIndex = -1;
            }
            this.sidenav.toggle(state);
            this.cd.detectChanges();
        });
        this.sidenavService.sectionChanged.subscribe((section: SidenavSectionModel) => {
            this.openSection = section.state;
        });
        this.sidenav.openedChange.subscribe(o => this.sidenavService.toggle(o));
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
                this.sidenav.disableClose = true;
                this.sidenav.fixedTopGap = 64;
                this.zIndex = -1;
                if (this.shouldStartOpen) {
                    this.sidenav.open();
                }
            }
        });
    }

    private getActiveSection() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                map(() => this.activatedRoute.firstChild),
                mergeMap((activatedRoute: any) => activatedRoute.url),
            )
            .subscribe((activeRoute: any) => (this.openSection = '/' + activeRoute[0].path));
    }
}
