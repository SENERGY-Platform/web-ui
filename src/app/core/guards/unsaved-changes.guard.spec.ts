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

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
    HasUnsavedChanges,
    UNSAVED_CHANGES_TEXT,
    UNSAVED_CHANGES_TITLE,
    unsavedChangesGuard,
} from './unsaved-changes.guard';
import { DialogsService } from '../services/dialogs.service';
import { UnsavedChanges } from '../../modules/processes/designer/bpmn-js/unsaved-changes';

describe('unsavedChangesGuard', () => {
    let openConfirmDialog: jasmine.Spy;
    let answer: boolean | undefined;

    const page = (changed: boolean): HasUnsavedChanges => {
        const unsaved = new UnsavedChanges();
        if (changed) {
            unsaved.markChanged();
        }
        return { unsaved };
    };

    const leaves = (component: HasUnsavedChanges): boolean | undefined => {
        const snapshot = {} as ActivatedRouteSnapshot;
        const state = {} as RouterStateSnapshot;
        const result = TestBed.runInInjectionContext(() => unsavedChangesGuard(component, snapshot, state, state));
        let left: boolean | undefined;
        (result instanceof Observable ? result : of(result as boolean)).subscribe((v) => (left = v as boolean));
        return left;
    };

    beforeEach(() => {
        answer = true;
        openConfirmDialog = jasmine.createSpy('openConfirmDialog').and.callFake(() => ({ afterClosed: () => of(answer) }));
        TestBed.configureTestingModule({
            providers: [{ provide: DialogsService, useValue: { openConfirmDialog } }],
        });
    });

    it('lets a page without changes go without asking', () => {
        expect(leaves(page(false))).toBeTrue();
        expect(openConfirmDialog).not.toHaveBeenCalled();
    });

    it('lets a saved page go without asking, because saving is what the page was asked to do', () => {
        const component = page(true);
        component.unsaved.markSaved(component.unsaved.snapshot());

        expect(leaves(component)).toBeTrue();
        expect(openConfirmDialog).not.toHaveBeenCalled();
    });

    it('asks before leaving a page that holds unsaved edits', () => {
        expect(leaves(page(true))).toBeTrue();
        expect(openConfirmDialog).toHaveBeenCalledWith(UNSAVED_CHANGES_TITLE, UNSAVED_CHANGES_TEXT);
    });

    it('keeps the page when the question is answered with no', () => {
        answer = false;

        expect(leaves(page(true))).toBeFalse();
    });

    it('keeps the page when the question is dismissed, so a stray click does not discard the work', () => {
        answer = undefined;

        expect(leaves(page(true))).toBeFalse();
    });
});
