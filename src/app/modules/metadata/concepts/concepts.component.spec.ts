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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { ConceptsComponent } from './concepts.component';
import { ConceptsService } from './shared/concepts.service';
import { FunctionsService } from '../functions/shared/functions.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeConceptModel, DeviceTypeFunctionModel } from '../device-types-overview/shared/device-type.model';

describe('ConceptsComponent', () => {
    let component: ConceptsComponent;
    let fixture: ComponentFixture<ConceptsComponent>;

    const conceptsServiceSpy: Spy<ConceptsService> = createSpyFromClass<ConceptsService>(ConceptsService);
    const functionsServiceSpy: Spy<FunctionsService> = createSpyFromClass<FunctionsService>(FunctionsService);
    const matDialogStub = {open: jasmine.createSpy('open')};

    function dialogReturns(result: unknown) {
        matDialogStub.open.and.returnValue({afterClosed: () => of(result)});
    }

    function concept(id: string, name: string): DeviceTypeConceptModel {
        return {id, name, base_characteristic_id: '', characteristic_ids: []};
    }

    function func(id: string, name: string, conceptId: string): DeviceTypeFunctionModel {
        return {id, name, display_name: name, description: '', rdf_type: '', concept_id: conceptId};
    }

    function init() {
        conceptsServiceSpy.getConcepts.and.returnValue(of({result: [], total: 0}));
        conceptsServiceSpy.userHasUpdateAuthorization.and.returnValue(true);
        conceptsServiceSpy.userHasDeleteAuthorization.and.returnValue(true);
        functionsServiceSpy.getFunctionsByConceptIds.and.returnValue(of([]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule],
            declarations: [ConceptsComponent],
            providers: [
                {provide: ConceptsService, useValue: conceptsServiceSpy},
                {provide: FunctionsService, useValue: functionsServiceSpy},
                {provide: MatDialog, useValue: matDialogStub},
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ConceptsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        flush();
    }

    afterEach(() => {
        conceptsServiceSpy.deleteConcept.calls.reset();
        functionsServiceSpy.getFunctionsByConceptIds.calls.reset();
        matDialogStub.open.calls.reset();
    });

    it(
        'blocks a single delete while a function still references the concept, and never asks to confirm it',
        fakeAsync(() => {
            init();
            const c = concept('urn:infai:ses:concept:temp', 'Temperature');
            functionsServiceSpy.getFunctionsByConceptIds.and.returnValue(
                of([func('urn:infai:ses:function:get', 'Get-Temperature', c.id)]),
            );

            component.deleteConcept(c);
            flush();
            discardPeriodicTasks();

            expect(functionsServiceSpy.getFunctionsByConceptIds).toHaveBeenCalledOnceWith([c.id]);
            expect(matDialogStub.open).not.toHaveBeenCalled();
            expect(conceptsServiceSpy.deleteConcept).not.toHaveBeenCalled();
        }),
    );

    it(
        'deletes a concept once confirmed and no function references it any more',
        fakeAsync(() => {
            init();
            const c = concept('urn:infai:ses:concept:temp', 'Temperature');
            functionsServiceSpy.getFunctionsByConceptIds.and.returnValue(of([]));
            conceptsServiceSpy.deleteConcept.and.returnValue(of(true));
            dialogReturns(true);
            component.concepts = [c];

            component.deleteConcept(c);
            flush();
            discardPeriodicTasks();

            expect(conceptsServiceSpy.deleteConcept).toHaveBeenCalledOnceWith(c.id);
        }),
    );

    it(
        'bulk delete looks up all selected concepts in one request, skips the ones still in use and deletes the rest',
        fakeAsync(() => {
            init();
            const blocked = concept('urn:infai:ses:concept:temp', 'Temperature');
            const free = concept('urn:infai:ses:concept:humidity', 'Humidity');
            functionsServiceSpy.getFunctionsByConceptIds.and.returnValue(
                of([func('urn:infai:ses:function:get', 'Get-Temperature', blocked.id)]),
            );
            conceptsServiceSpy.deleteConcept.and.returnValue(of(true));
            dialogReturns(true);

            component.selection.select(blocked, free);
            component.deleteMultipleItems();
            flush();
            discardPeriodicTasks();

            expect(functionsServiceSpy.getFunctionsByConceptIds).toHaveBeenCalledOnceWith([blocked.id, free.id]);
            expect(conceptsServiceSpy.deleteConcept).toHaveBeenCalledOnceWith(free.id);
            expect(conceptsServiceSpy.deleteConcept).not.toHaveBeenCalledWith(blocked.id);
        }),
    );

    it(
        'bulk delete reports both a concept still in use and one whose deletion failed outright',
        fakeAsync(() => {
            init();
            const blocked = concept('urn:infai:ses:concept:temp', 'Temperature');
            const failing = concept('urn:infai:ses:concept:humidity', 'Humidity');
            functionsServiceSpy.getFunctionsByConceptIds.and.returnValue(
                of([func('urn:infai:ses:function:get', 'Get-Temperature', blocked.id)]),
            );
            // failing.id is not blocked, so it is attempted and the device-repository refuses it outright
            conceptsServiceSpy.deleteConcept.and.returnValue(of(false));
            dialogReturns(true);
            const snackBar = TestBed.inject(MatSnackBar);
            const openSpy = spyOn(snackBar, 'open').and.callThrough();

            component.selection.select(blocked, failing);
            component.deleteMultipleItems();
            flush();
            discardPeriodicTasks();

            expect(conceptsServiceSpy.deleteConcept).toHaveBeenCalledOnceWith(failing.id);
            const message = openSpy.calls.mostRecent().args[0] as string;
            expect(message).toContain(blocked.name);
            expect(message).toContain('1 concept could not be deleted');
        }),
    );
});
