/*
 * Copyright 2023 InfAI (CC SES)
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
    AfterViewChecked,
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {ResponsiveService} from '../../services/responsive.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-fit-text',
    templateUrl: './fit-text.component.html',
    styleUrls: ['./fit-text.component.css']
})
export class FitTextComponent implements AfterViewInit, OnChanges, OnDestroy, AfterViewChecked {
    @ViewChild('element', {static: false}) element!: ElementRef;

    @Input() txt = '';
    @Input() maxFontSize = 128;
    @Input() minFontSize = 8;

    private resizeTimeout: any;
    private subscription: Subscription | undefined;
    private scrollWidth = 0;
    private clientWidth = 0;
    private scrollHeight = 0;
    private clientHeight = 0;

    constructor(private responsiveService: ResponsiveService) {
    }

    ngAfterViewInit() {
        this.subscription = this.responsiveService.observeMqAlias().subscribe(() => {
            if (this.resizeTimeout === undefined) {
                this.resizeTimeout = setTimeout(() => this.resizeText(), 0);
            }
        });
        if (this.resizeTimeout === undefined) {
            this.resizeTimeout = setTimeout(() => this.resizeText(), 0);
        }
    }


    ngOnChanges(_: SimpleChanges): void {
        if (this.resizeTimeout === undefined) {
            this.resizeTimeout = setTimeout(() => this.resizeText(), 0);
        }
    }

    ngAfterViewChecked() {
        if (this.scrollWidth !== this.element.nativeElement.scrollWidth ||
            this.clientWidth !== this.element.nativeElement.clientWidth ||
            this.scrollHeight !== this.element.nativeElement.scrollHeight ||
            this.clientHeight !== this.element.nativeElement.clientHeight) {
            if (this.resizeTimeout === undefined) {
                this.resizeTimeout = setTimeout(() => this.resizeText(), 0);
            }
        }
    }

    ngOnDestroy(): void {
        if (this.resizeTimeout !== undefined) {
            clearTimeout(this.resizeTimeout);
        }
        this.subscription?.unsubscribe();
    }

    private isOverflown(element: any) {
        return (element.scrollWidth > element.clientWidth) || (element.scrollHeight > element.clientHeight); // element.offsetLeft < 0 || element.offsetTop < 0;
    }

    private resizeText() {
        let i = this.minFontSize;
        let overflow = false;

        while (!overflow && i < this.maxFontSize) {
            this.element.nativeElement.style.fontSize = `${i}px`;
            overflow = this.isOverflown(this.element.nativeElement);
            if (!overflow) {
                i++;
            }
        }
        this.element.nativeElement.style.fontSize = `${i - 1}px`;
        this.scrollWidth = this.element.nativeElement.scrollWidth;
        this.clientWidth = this.element.nativeElement.clientWidth;
        this.scrollHeight = this.element.nativeElement.scrollHeight;
        this.clientHeight = this.element.nativeElement.clientHeight;

        this.resizeTimeout = undefined;
    }
}
