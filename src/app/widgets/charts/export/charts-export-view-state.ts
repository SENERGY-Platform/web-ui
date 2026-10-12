/*
 * Copyright 2026 InfAI (CC SES)
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

import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportVAxesModel } from './shared/charts-export-properties.model';

export interface ChartsExportDrillEntry {
    axes: ChartsExportVAxesModel[];
    stacked: boolean;
}

/**
 * The zoom and drill state of an export chart, kept in localStorage under keys that start with the widget id so it
 * survives a reload; removeWidgetStorage and cleanupStaleViewState address the same keys. The widget is read on every
 * access because the component's input can be replaced.
 */
export class ChartsExportViewState {
    constructor(private widget: () => WidgetModel) {
    }

    private key(suffix: string): string {
        return this.widget().id + suffix;
    }

    get groupTime(): string | null {
        return localStorage.getItem(this.key('_groupTime')) || this.widget().properties.group?.time || null;
    }

    set groupTime(groupTime: string | null) {
        if (groupTime === null) {
            localStorage.removeItem(this.key('_groupTime'));
        } else {
            localStorage.setItem(this.key('_groupTime'), groupTime);
        }
    }

    get hAxisFormat(): string | undefined {
        return localStorage.getItem(this.key('_hAxisFormat')) || this.widget().properties.hAxisFormat;
    }

    set hAxisFormat(hAxisFormat: string | null) {
        if (hAxisFormat === null) {
            localStorage.removeItem(this.key('_hAxisFormat'));
        } else {
            localStorage.setItem(this.key('_hAxisFormat'), hAxisFormat);
        }
    }

    get from(): Date | null {
        const str = localStorage.getItem(this.key('_from'));
        if (str === null) {
            return null;
        }
        return new Date(str);
    }

    set from(from: Date | null) {
        if (from === null) {
            localStorage.removeItem(this.key('_from'));
        } else {
            localStorage.setItem(this.key('_from'), from.toISOString());
        }
    }

    get to(): Date | null {
        const str = localStorage.getItem(this.key('_to'));
        if (str === null) {
            return null;
        }
        return new Date(str);
    }

    set to(to: Date | null) {
        if (to === null) {
            localStorage.removeItem(this.key('_to'));
        } else {
            localStorage.setItem(this.key('_to'), to.toISOString());
        }
    }

    get modifiedVaxes(): ChartsExportVAxesModel[] | null {
        const str = localStorage.getItem(this.key('_modifiedvAxes'));
        if (str === null) {
            return null;
        }
        return JSON.parse(str);
    }

    set modifiedVaxes(axes: ChartsExportVAxesModel[] | null) {
        if (axes === null) {
            localStorage.removeItem(this.key('_modifiedvAxes'));
        } else {
            localStorage.setItem(this.key('_modifiedvAxes'), JSON.stringify(axes));
        }
    }

    get stacked(): boolean {
        const str = localStorage.getItem(this.key('_stacked'));
        if (str === null) {
            return this.widget().properties.stacked || false;
        }
        return JSON.parse(str);
    }

    set stacked(stacked: boolean | null) {
        if (stacked === null) {
            localStorage.removeItem(this.key('_stacked'));
        } else {
            localStorage.setItem(this.key('_stacked'), '' + stacked);
        }
    }

    get chooseColors(): boolean {
        const str = localStorage.getItem(this.key('_chooseColors'));
        if (str === null) {
            return false;
        }
        return JSON.parse(str);
    }

    set chooseColors(chooseColors: boolean | null) {
        if (chooseColors === null) {
            localStorage.removeItem(this.key('_chooseColors'));
        } else {
            localStorage.setItem(this.key('_chooseColors'), '' + chooseColors);
        }
    }

    /** True if any localStorage key starts with the widget id, which is what the reset icon offers to clear. */
    hasStoredState(): boolean {
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i)?.startsWith(this.widget().id)) {
                return true;
            }
        }
        return false;
    }

    drillStackPush(axes: ChartsExportVAxesModel[], stacked: boolean): void {
        const stack = this.readDrillStack();
        stack.push({ axes, stacked });
        localStorage.setItem(this.key('_drillStack'), JSON.stringify(stack));
    }

    drillStackPop(): ChartsExportDrillEntry | null {
        const stack = this.readDrillStack();
        if (stack.length === 0) {
            return null;
        }
        const res = stack.pop();
        if (stack.length === 0) {
            localStorage.removeItem(this.key('_drillStack'));
        } else {
            localStorage.setItem(this.key('_drillStack'), JSON.stringify(stack));
        }
        return res || null;
    }

    drillStackPeek(): ChartsExportDrillEntry | null {
        const stack = this.readDrillStack();
        if (stack.length === 0) {
            return null;
        }
        return stack[stack.length - 1];
    }

    private readDrillStack(): ChartsExportDrillEntry[] {
        return JSON.parse(localStorage.getItem(this.key('_drillStack')) || '[]') as ChartsExportDrillEntry[];
    }
}
