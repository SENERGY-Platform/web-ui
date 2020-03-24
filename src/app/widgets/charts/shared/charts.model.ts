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

export class ChartsModel {
    constructor(
        public chartType: string,
        public dataTable: (Date | string | number | {role: string}) [][],
        public options?: {
            chartArea?: {
                left?: number,
                top?: number,
                width: string,
                height: string,
            },
            height?: number,
            width?: number,
            pieSliceText?: string,
            legend?: string,
            curveType?: string,
            tooltip?: {
                trigger?: string;
            }
            vAxis?: {
                format?: string;
                title?: string;
                gridlines?: {
                    count: number;
                };
                viewWindow?: {
                    min?: number;
                    max?: number;
                };
            }
            hAxis?: {
                format?: string;
                title?: string;
                gridlines?: {
                    count?: number
                }
            }
            colors?: string[];
            interpolateNulls?: boolean;
            explorer?: {
                actions?: string[];
                axis?: string;
                keepInBounds?: boolean;
                maxZoomIn?: number;
            }
        }
    ) {
    }
}




