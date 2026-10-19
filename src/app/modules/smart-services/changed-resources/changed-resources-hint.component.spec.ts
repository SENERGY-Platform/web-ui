/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { ChangedResourcesHintComponent } from './changed-resources-hint.component';

describe('ChangedResourcesHintComponent', () => {
    let fixture: ComponentFixture<ChangedResourcesHintComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ChangedResourcesHintComponent],
        });
        fixture = TestBed.createComponent(ChangedResourcesHintComponent);
    });

    it('lists kind, id, reason and date of every changed resource', () => {
        fixture.componentInstance.resources = [
            { kind: 'flow', id: 'flow-1', reason: 'changed', at: 1760000000 },
            { kind: 'import_type', id: 'it-1', reason: 'gone', at: 1760000000 },
        ];
        fixture.detectChanges();

        const icon = fixture.debugElement.query(By.css('mat-icon'));
        const message = icon.injector.get(MatTooltip).message;
        expect(message).toContain('Flow flow-1: changed on');
        expect(message).toContain('Import type it-1: gone on');
    });

    it('shows nothing without changed resources', () => {
        fixture.componentInstance.resources = undefined;
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('mat-icon'))).toBeNull();

        fixture.componentInstance.resources = [];
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('mat-icon'))).toBeNull();
    });

    it('shows a status chip with the same tooltip instead of the icon when asked for', () => {
        fixture.componentInstance.chip = true;
        fixture.componentInstance.resources = [{ kind: 'flow', id: 'flow-1', reason: 'gone', at: 1760000000 }];
        fixture.detectChanges();

        const chip = fixture.debugElement.query(By.css('.status-chip.warning'));
        expect(chip.nativeElement.textContent).toContain('Resources changed');
        expect(chip.injector.get(MatTooltip).message).toContain('Flow flow-1: gone on');
        expect(fixture.debugElement.query(By.css('mat-icon'))).toBeNull();
    });
});
