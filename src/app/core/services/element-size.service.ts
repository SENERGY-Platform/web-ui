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

import {Injectable} from '@angular/core';


@Injectable({
    providedIn: 'root'
})

export class ElementSizeService {

    constructor() {
    }

    getHeightAndWidthByElementId(elementId: string, heightPercentageAdjustment?: number): { 'height': number, 'width': number, 'heightPercentage': string, 'widthPercentage': string } {
        let height = 0;
        let width = 0;
        let heightPercentage = '75%';
        let widthPercentage = '75%';

        const element = document.getElementById(elementId);

        if (element !== null) {
            height = element.offsetHeight - 1;
            width = element.offsetWidth - 1;
            heightPercentage = this.calcHeightPercentage(height, heightPercentageAdjustment || 0);
            widthPercentage = this.calcWidthPercentage(width);
        }

        return {height, width, heightPercentage, widthPercentage};
    }

    private calcHeightPercentage(height: number, heightPercentageAdjustment: number): string {
        let percentage = 0;
        if (height < 200) {
            percentage = 70;
        } else {
            if (height < 400) {
                percentage = 75;
            } else {
                if (height < 500) {
                    percentage = 80;
                } else {
                    percentage = 90;
                }
            }
        }
        return percentage - heightPercentageAdjustment + '%';
    }

    private calcWidthPercentage(width: number): string {
        let percentage = 0;
        if (width < 350) {
            percentage = 65;
        } else {
            if (width < 400) {
                percentage = 70;
            } else {
                if (width < 800) {
                    percentage = 75;
                } else {
                    if (width < 1100) {
                        percentage = 82;
                    } else {
                        if (width < 1400) {
                            percentage = 85;
                        } else {
                            percentage = 85;
                        }
                    }
                }
            }
        }

        return percentage + '%';
    }
}
