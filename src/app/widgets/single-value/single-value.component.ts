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


import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WidgetModel} from '../../modules/dashboard/shared/dashboard-widget.model';
import {DomSanitizer} from '@angular/platform-browser';
import {SingleValueService} from './shared/single-value.service';
import {SingleValueModel} from './shared/single-value.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {MatIconRegistry} from '@angular/material/icon';
import {FormControl} from '@angular/forms';
import {debounceTime} from 'rxjs/operators';
import {animate, state, style, transition, trigger,} from '@angular/animations';

@Component({
    selector: 'senergy-single-value',
    templateUrl: './single-value.component.html',
    styleUrls: ['./single-value.component.css'],
    animations: [
        trigger('animate', [
            state('true', style({
                marginLeft: '{{marginLeft}}',
            }), {
                params: {
                    marginLeft: '0px',
                }
            }),
            state('false', style({
                marginLeft: '{{marginLeft}}',
            }), {
                params: {
                    marginLeft: '0px',
                }
            }),
            transition('1 => 0', [
                animate('100ms')
            ]),
            transition('0 => 1', [
                animate('100ms')
            ]),
        ]),
    ]
})
export class SingleValueComponent implements OnInit, OnDestroy {
    svList: SingleValueModel[] = [];
    sv: SingleValueModel = {} as SingleValueModel;
    ready = false;
    configured = false;
    dataReady = false;
    destroy = new Subscription();
    marginLeft = '0';
    private _svListIndex = 4; // TODO
    animationState = false;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild('content', {static: false}) contentBox!: ElementRef;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdateAuthorization = false;
    dateControl: FormControl<string | null> = new FormControl<string>('');

    constructor(
        private iconRegistry: MatIconRegistry,
        private sanitizer: DomSanitizer,
        private singleValueService: SingleValueService,
        private dashboardService: DashboardService,
    ) {
    }

    set svListIndex(i: number) {
        this._svListIndex = i;
        this.marginLeft = ((i - 1) * -25) + 'vw';
        this.animate();
    }

    get svListIndex(): number {
        return this._svListIndex;
    }


    ngOnInit() {
        this.scheduleRefresh();
        this.registerIcons();
        this.setConfigured();
        this.dateControl.valueChanges.pipe(debounceTime(300)).subscribe((localDateString) => {
            if (localDateString === null) {
                return;
            }
            this.refresh(localDateString);
        });
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {
    }

    edit() {
        this.singleValueService.openEditDialog(this.dashboardId, this.widget.id);
    }

    width(): number {
        return this.contentBox?.nativeElement.scrollWidth || 0;
    }

    height(): number {
        return this.contentBox?.nativeElement.scrollHeight || 0;
    }

    private scheduleRefresh() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refresh();
            }
        });
    }

    private refresh(localDateString?: string) {
        this.ready = false;
        this.dataReady = false;
        this.sv = {} as SingleValueModel;
        this.svList = [];
        if (this.zoom && localDateString === undefined) {
            localDateString = new Date().toISOString();
        }
        this.singleValueService.getValues(this.widget, localDateString === undefined ? undefined : new Date(localDateString)).subscribe(
            (sv: SingleValueModel[]) => {
                if (sv.length === 1) {
                    this.sv = sv[0];
                } else {
                    this.svList = sv;
                    if (localDateString !== undefined) {
                        let found = false;
                        for (let i = 1; i < sv.length; i++) {
                            if (sv[i].date > new Date(localDateString)) {
                                this.dateControl.setValue(sv[i - 1].date.toLocaleString('sv').replace(' ', 'T'), {emitEvent: false});
                                this.svListIndex = i - 1;
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            this.dateControl.setValue(sv[sv.length-1].date.toLocaleString('sv').replace(' ', 'T'), {emitEvent: false});
                            this.svListIndex = sv.length-1;
                        }
                    }
                }
                this.ready = true;
                this.dataReady = true;
            },
            () => {
                this.ready = true;
            },
        );
    }

    private setConfigured() {
        this.configured = this.widget.properties.measurement !== undefined;
    }

    right() {
        if (this.svListIndex < this.svList.length - 1) {
            this.svListIndex++;
        }
    }

    left() {
        if (this.svListIndex > 0) {
            this.svListIndex--;
        }
    }

    wheel($event: WheelEvent) {
        if ($event.deltaY > 0) {
            this.left();
        } else {
            this.right();
        }
    }

    animate() {
        this.animationState = !this.animationState;
    }


}
