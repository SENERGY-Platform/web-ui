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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ReleaseDesignDialogComponent } from './release-design-dialog.component';
import { SmartServiceReleasesService } from '../../shared/release.service';
import { AuthorizationService } from '../../../../../core/services/authorization.service';
import { SmartServiceReleaseModel } from '../../shared/release.model';

describe('ReleaseDesignDialogComponent', () => {
    let fixture: ComponentFixture<ReleaseDesignDialogComponent>;
    let close: jasmine.Spy;
    let getReleaseList: jasmine.Spy;

    const release = (id: string, designId: string, creator: string, name: string, description = ''): SmartServiceReleaseModel =>
        ({ id, design_id: designId, creator, name, description, created_at: '' });

    async function create(releases: SmartServiceReleaseModel[]): Promise<void> {
        close = jasmine.createSpy('close');
        getReleaseList = jasmine.createSpy('getReleaseList').and.returnValue(of({ releases, total: releases.length }));
        await TestBed.configureTestingModule({
            imports: [ReleaseDesignDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { design: { id: 'design-new', name: 'Room info', description: 'rebuilt', bpmn_xml: '', svg_xml: '', user_id: 'alice' } } },
                { provide: SmartServiceReleasesService, useValue: { getReleaseList } },
                { provide: AuthorizationService, useValue: { getUserId: () => 'alice' } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ReleaseDesignDialogComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('mat-dialog-actions button'));

    describe('for a design without a release of its own', () => {
        beforeEach(() => create([
            release('r-b', 'design-b', 'alice', 'Heating', 'rooms'),
            release('r-a', 'design-gone', 'alice', 'Alarm'),
            release('r-shared', 'design-c', 'bob', 'Shared with alice'),
        ]));

        it('asks for the current releases and offers those of the user from other designs, by name', () => {
            expect(getReleaseList).toHaveBeenCalledOnceWith(9999, 0, '', 'w', true);
            expect(fixture.componentInstance.candidates).toEqual([{ id: 'r-a', label: 'Alarm' }, { id: 'r-b', label: 'Heating - rooms' }]);
            expect(el().textContent).toContain('Update of release');
        });

        it('closes with name and description of the design and no update_of by default', () => {
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ design_id: 'design-new', name: 'Room info', description: 'rebuilt' });
        });

        it('closes with the chosen release as update_of', () => {
            fixture.componentInstance.updateOf = 'r-a';
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ design_id: 'design-new', name: 'Room info', description: 'rebuilt', update_of: 'r-a' });
        });

        it('closes with null on Cancel', () => {
            buttons()[0].click();
            expect(close).toHaveBeenCalledOnceWith(null);
        });
    });

    describe('for a design that already has a release', () => {
        beforeEach(() => create([release('r-own', 'design-new', 'alice', 'Room info v1'), release('r-a', 'design-gone', 'alice', 'Alarm')]));

        it('names that release and offers no choice, since the new release updates it', () => {
            expect(el().textContent).toContain('This design already has the release "Room info v1"');
            expect(el().textContent).not.toContain('Update of release');
        });

        it('never sends update_of', () => {
            fixture.componentInstance.updateOf = 'r-a';
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ design_id: 'design-new', name: 'Room info', description: 'rebuilt' });
        });
    });
});
