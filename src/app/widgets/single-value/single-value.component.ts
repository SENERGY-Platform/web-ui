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
import {SingleValueAggregations, SingleValueModel} from './shared/single-value.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Observable, Subscription, map} from 'rxjs';
import {MatIconRegistry} from '@angular/material/icon';
import {FormControl} from '@angular/forms';
import {debounceTime} from 'rxjs/operators';
import {animate, state, style, transition, trigger,} from '@angular/animations';

const DateDiff = {
    inSeconds(d1: Date, d2: Date) {
        const t2 = d2.getTime();
        const t1 = d1.getTime();

        return Math.floor((t2-t1)/(1000));
    },

    inMinutes(d1: Date, d2: Date) {
        const t2 = d2.getTime();
        const t1 = d1.getTime();

        return Math.floor((t2-t1)/(60*1000));
    },

    inHours(d1: Date, d2: Date) {
        const t2 = d2.getTime();
        const t1 = d1.getTime();

        return Math.floor((t2-t1)/(60*60*1000));
    },

    inDays(d1: Date, d2: Date) {
        const t2 = d2.getTime();
        const t1 = d1.getTime();

        return Math.floor((t2-t1)/(24*3600*1000));
    },

    inWeeks(d1: Date, d2: Date) {
        const t2 = d2.getTime();
        const t1 = d1.getTime();

        return Math.floor((t2-t1)/(7*24*3600*1000));
    },

    inMonths(d1: Date, d2: Date) {
        const d1Y = d1.getFullYear();
        const d2Y = d2.getFullYear();
        const d1M = d1.getMonth();
        const d2M = d2.getMonth();

        return (d2M+12*d2Y)-(d1M+12*d1Y);
    },
};

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
    sv?: SingleValueModel;
    ready = false;
    refreshing = false;
    configured = false;
    showTimestamp = false;
    timestamp?: string;
    timestampAgeClass = '';
    error = false;
    destroy = new Subscription();
    marginLeft = '0';
    private _svListIndex = 0;
    animationState = false;
    highlightColor = 'black';

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild('content', {static: false}) contentBox!: ElementRef;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

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
        this.dateControl.valueChanges.pipe(debounceTime(1000)).subscribe((localDateString) => {
            if (localDateString === null) {
                return;
            }
            this.refreshView();
        });
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {
    }

    edit() {
        this.singleValueService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
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
                this.refreshView();
            }
        });
    }

    private refreshView() {
        this.refreshing = true;

        this.loadSingleValue().pipe(
            map((_) => {
                this.showTimestamp = this.widget.properties.timestampConfig?.showTimestamp == true;
                this.setTimestampColor();
                this.setHighlightColor();
            })
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.refreshing = false;
                this.error = false;
            },
            error: (_) => {
                this.ready = true;
                this.refreshing = false;
                this.error = true;
            }
        });

    }

    private loadSingleValue(localDateString?: string): Observable<SingleValueModel[]> {
        if (this.zoom && localDateString === undefined) {
            localDateString = new Date().toISOString();
        }
        return this.singleValueService.getValues(this.widget, localDateString === undefined ? undefined : new Date(localDateString)).pipe(
            map((sv: SingleValueModel[]) => {
                if (sv.length === 1) {
                    this.sv = sv[0];
                } else {
                    this.svList = sv;
                    if (localDateString !== undefined) {
                        let found = false;
                        for (let i = 1; i < sv.length; i++) {
                            const d = new Date(localDateString);
                            if (sv[i].date > d) {
                                if (sv[i - 1].date.getDate() === d.getDate() && sv[i].date.getDate() !== d.getDate()) {
                                    i -= 1;
                                } else if (sv[i - 1].date.getDate() !== d.getDate() && sv[i].date.getDate() === d.getDate()) {
                                    // nop
                                } else if (Math.abs(sv[i - 1].date.valueOf() - d.valueOf()) < Math.abs(sv[i].date.valueOf() - d.valueOf())) {
                                    i -= 1;
                                }
                                this.dateControl.setValue(sv[i].date.toLocaleString('sv').replace(' ', 'T'), {emitEvent: false});
                                this.svListIndex = i;
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
                return sv;
            })
        );
    }

    private setConfigured() {
        this.configured = this.widget.properties.measurement !== undefined;
    }

    private sortHighlightConfigs() {
        // highlight configs must be sorted 

    }

    private setHighlightColor() {
        const config = this.widget.properties.valueHighlightConfig;
        const currentValue = this.sv?.value;
        if(config && currentValue && config.highlight) {
            // thresholds must be sorted so that the biggest/smallest threshold is applied
            // e.g. <= 10, <= 20, <= 50 -> <= 10 should be applied
            const smallerThreshold = config.thresholds.filter(threshold => threshold.direction === '<=').sort((a, b) => b.threshold - a.threshold);
            const biggerThreshold = config.thresholds.filter(threshold => threshold.direction === '>=').sort((a, b) => a.threshold - b.threshold);
            smallerThreshold.forEach(thresholdConfig => {
                const threshold = thresholdConfig.threshold;
                const direction = thresholdConfig.direction;
                const thresholdReached = (direction === '<=' && currentValue <= threshold);
                if(thresholdReached) {
                    this.highlightColor = thresholdConfig.color;
                }
            });
            biggerThreshold.forEach(thresholdConfig => {
                const threshold = thresholdConfig.threshold;
                const direction = thresholdConfig.direction;
                const thresholdReached = (direction === '>=' && currentValue >= threshold);
                if(thresholdReached) {
                    this.highlightColor = thresholdConfig.color;
                }
            });
        }
    }

    private setTimestampColor() {
        if(!this.widget.properties.timestampConfig?.highlightTimestamp) {
            this.timestampAgeClass = 'no-age';
            return;
        }

        let date: Date;
        if(this.sv !== undefined) {
            date = this.sv.date;
        } else {
            date = this.svList[this.svListIndex].date;
        }
        this.timestampAgeClass = 'age-okay';

        let timeSinceLastValue: number;
        switch(this.widget.properties.timestampConfig?.warningTimeLevel) {
        case('s'):
            timeSinceLastValue = DateDiff.inSeconds(date, new Date());
            break;
        case('min'):
            timeSinceLastValue = DateDiff.inMinutes(date, new Date());
            break;
        case('h'):
            timeSinceLastValue = DateDiff.inHours(date, new Date());
            break;
        case('d'):
            timeSinceLastValue = DateDiff.inDays(date, new Date());
            break;
        case('m'):
            timeSinceLastValue = DateDiff.inMonths(date, new Date());
            break;
        default:
            return;
        }
        if(timeSinceLastValue >= this.widget.properties.timestampConfig?.warningAge) {
            this.timestampAgeClass = 'age-warning';
        }

        switch(this.widget.properties.timestampConfig?.problemTimeLevel) {
        case('s'):
            timeSinceLastValue = DateDiff.inSeconds(date, new Date());
            break;
        case('min'):
            timeSinceLastValue = DateDiff.inMinutes(date, new Date());
            break;
        case('h'):
            timeSinceLastValue = DateDiff.inHours(date, new Date());
            break;
        case('d'):
            timeSinceLastValue = DateDiff.inDays(date, new Date());
            break;
        case('m'):
            timeSinceLastValue = DateDiff.inMonths(date, new Date());
            break;
        default:
            return;
        }

        if(timeSinceLastValue >= this.widget.properties.timestampConfig?.problemAge) {
            this.timestampAgeClass = 'age-problem';
        }
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

    zoomEnabled() {
        return this.widget.properties.group?.type === undefined && this.widget.properties.deviceGroupAggregation === SingleValueAggregations.Latest;
    }

}
