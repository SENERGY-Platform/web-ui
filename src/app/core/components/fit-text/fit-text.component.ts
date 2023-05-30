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
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {ResponsiveService} from '../../services/responsive.service';

@Component({
    selector: 'senergy-fit-text',
    templateUrl: './fit-text.component.html',
    styleUrls: ['./fit-text.component.css']
})
export class FitTextComponent implements AfterViewInit, OnChanges, AfterViewChecked {
    @ViewChild('element', {static: false}) element!: ElementRef;

    @Input() txt = '';
    @Input() maxFontSize = 128;
    @Input() minFontSize = 8;

    private timeout: any;


    constructor(private responsiveService: ResponsiveService) {
    }

    ngAfterViewInit() {
        this.responsiveService.observeMqAlias().subscribe(() => {
            this.resizeText();
        });
    }

    ngAfterViewChecked(): void {
        this.resizeText();
    }

    ngOnChanges(_: SimpleChanges): void {
        this.resizeText();
    }

    private isOverflown(element: any) {
        return (element.scrollWidth > element.clientWidth) || (element.scrollHeight > element.clientHeight); // element.offsetLeft < 0 || element.offsetTop < 0;
    }

    private resizeText() {
        if (this.timeout !== undefined) {
            // already queued
            return;
        }
        if (this.element === undefined || this.element.nativeElement.scrollWidth === 0) {
            this.timeout = setTimeout(() => {
                this.timeout = undefined;
                this.resizeText();
            }, 10);
        } else {
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
        }
    }
}
