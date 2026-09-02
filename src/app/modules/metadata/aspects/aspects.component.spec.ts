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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTreeModule } from '@angular/material/tree';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { MtxSelect, MtxSelectModule } from '@ng-matero/extensions/select';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { AspectsComponent } from './aspects.component';
import { AspectsService } from './shared/aspects.service';
import { AspectClassesService } from './shared/aspect-classes.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeAspectClassModel, DeviceTypeAspectModel } from '../device-types-overview/shared/device-type.model';

describe('AspectsComponent', () => {
    let component: AspectsComponent;
    let fixture: ComponentFixture<AspectsComponent>;

    const aspectsServiceSpy: Spy<AspectsService> = createSpyFromClass<AspectsService>(AspectsService);
    const aspectClassesServiceSpy: Spy<AspectClassesService> = createSpyFromClass<AspectClassesService>(AspectClassesService);
    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const authServiceSpy: Spy<AuthorizationService> = createSpyFromClass<AuthorizationService>(AuthorizationService);
    const matDialogStub = {open: jasmine.createSpy('open')};

    function dialogReturns(result: unknown) {
        matDialogStub.open.and.returnValue({afterClosed: () => of(result)});
    }

    // A classified hierarchy as the device-repository returns it: the root assigns the class and every
    // sub-aspect comes back carrying the same value.
    function airHierarchy(): DeviceTypeAspectModel[] {
        return [
            {
                id: 'urn:infai:ses:aspect:air',
                name: 'air',
                aspect_class_id: 'urn:infai:ses:aspect-class:environment',
                sub_aspects: [
                    {
                        id: 'urn:infai:ses:aspect:inside_air',
                        name: 'inside_air',
                        aspect_class_id: 'urn:infai:ses:aspect-class:environment',
                        sub_aspects: [
                            {
                                id: 'urn:infai:ses:aspect:morning_air',
                                name: 'morning_air',
                                aspect_class_id: 'urn:infai:ses:aspect-class:environment',
                                sub_aspects: [],
                            },
                        ],
                    },
                ],
            },
        ];
    }

    const environmentClassEntry = {id: 'urn:infai:ses:aspect-class:environment', name: 'environment'};

    function init(
        aspects: DeviceTypeAspectModel[],
        mayCreateAspectClasses = true,
        userIsAdmin = true,
        aspectClasses: DeviceTypeAspectClassModel[] = [environmentClassEntry],
    ) {
        deviceTypeServiceSpy.userHasUsedInAuthorization.and.returnValue(false);
        deviceTypeServiceSpy.getAspects.and.returnValue(of(aspects));
        aspectClassesServiceSpy.userHasReadAuthorization.and.returnValue(true);
        aspectClassesServiceSpy.userHasCreateAuthorization.and.returnValue(mayCreateAspectClasses);
        aspectClassesServiceSpy.userHasUpdateAuthorization.and.returnValue(true);
        aspectClassesServiceSpy.getAspectClasses.and.returnValue(of(aspectClasses));
        authServiceSpy.userIsAdmin.and.returnValue(userIsAdmin);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [
                CoreModule,
                RouterTestingModule,
                NoopAnimationsModule,
                MatSnackBarModule,
                MatTreeModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                DragDropModule,
                FormsModule,
                FlexLayoutModule,
                MtxSelectModule,
            ],
            declarations: [AspectsComponent],
            providers: [
                {provide: AspectsService, useValue: aspectsServiceSpy},
                {provide: AspectClassesService, useValue: aspectClassesServiceSpy},
                {provide: DeviceTypeService, useValue: deviceTypeServiceSpy},
                {provide: AuthorizationService, useValue: authServiceSpy},
                {provide: MatDialog, useValue: matDialogStub},
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AspectsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    afterEach(() => {
        aspectsServiceSpy.updateAspects.calls.reset();
        aspectsServiceSpy.deleteAspects.calls.reset();
        aspectClassesServiceSpy.createAspectClass.calls.reset();
        matDialogStub.open.calls.reset();
    });

    /** air > (inside_air > morning_air, outside_air), carrying no class yet */
    function unclassifiedAir(): DeviceTypeAspectModel {
        return {
            id: 'urn:infai:ses:aspect:air',
            name: 'air',
            sub_aspects: [
                {
                    id: 'urn:infai:ses:aspect:inside_air',
                    name: 'inside_air',
                    sub_aspects: [
                        {id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []},
                    ],
                },
                {id: 'urn:infai:ses:aspect:outside_air', name: 'outside_air', sub_aspects: []},
            ],
        };
    }

    /** environment > air > (…), so the aspect to convert hangs somewhere inside a tree */
    function nestedAir(): DeviceTypeAspectModel[] {
        return [{id: 'urn:infai:ses:aspect:environment', name: 'environment', sub_aspects: [unclassifiedAir()]}];
    }

    const newClass = {id: 'urn:infai:ses:aspect-class:air', name: 'air'};

    /** Every real root hierarchy, reaching through the aspect-class group rows. */
    function rootAspects(): DeviceTypeAspectModel[] {
        const flat: DeviceTypeAspectModel[] = [];
        component.dataSource.data.forEach((node) => {
            if (component.isAspectClassGroup(node)) {
                flat.push(...(node.sub_aspects || []));
            } else {
                flat.push(node);
            }
        });
        return flat;
    }

    /** A root hierarchy by name; the group rows shift the indices of dataSource.data around. */
    function rootByName(name: string): DeviceTypeAspectModel {
        return rootAspects().find(a => a.name === name) as DeviceTypeAspectModel;
    }

    function groupByName(name: string): DeviceTypeAspectModel {
        return component.dataSource.data
            .find(n => component.isAspectClassGroup(n) && n.name === name) as DeviceTypeAspectModel;
    }

    /** The tags of the siblings in front of an element, which is what decides where it starts. */
    function tagsBefore(element: HTMLElement): string[] {
        const tags: string[] = [];
        let sibling = element.previousElementSibling;
        while (sibling !== null) {
            tags.unshift(sibling.tagName);
            sibling = sibling.previousElementSibling;
        }
        return tags;
    }

    function writtenAspects(): DeviceTypeAspectModel[] {
        return aspectsServiceSpy.updateAspects.calls.all().map(c => c.args[0] as DeviceTypeAspectModel);
    }

    /** Writes and deletes land in one list, so their order can be asserted across both services. */
    function recordWriteOrder(): string[] {
        const order: string[] = [];
        aspectsServiceSpy.updateAspects.and.callFake((aspect: DeviceTypeAspectModel) => {
            order.push('put:' + aspect.id);
            return of(aspect);
        });
        aspectsServiceSpy.deleteAspects.and.callFake((id: string) => {
            order.push('delete:' + id);
            return of(true);
        });
        return order;
    }

    it(
        'puts every hierarchy of one class under a single group row and leaves unclassified ones on top',
        fakeAsync(() => {
            const environmentClass = 'urn:infai:ses:aspect-class:environment';
            init([
                {id: 'urn:infai:ses:aspect:inside_air', name: 'inside_air', aspect_class_id: environmentClass,
                    sub_aspects: [{id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []}]},
                {id: 'urn:infai:ses:aspect:device', name: 'device', sub_aspects: []},
                {id: 'urn:infai:ses:aspect:outside_air', name: 'outside_air', aspect_class_id: environmentClass,
                    sub_aspects: []},
            ]);

            const top = component.dataSource.data;
            expect(top.length).toBe(2);

            // the class row takes the place a root aspect would hold, labelled with the class name
            expect(component.isAspectClassGroup(top[0])).toBeTrue();
            expect(top[0].name).toBe('environment');
            expect(top[0].id).toBe(environmentClass);
            expect(top[0].sub_aspects?.map(a => a.name)).toEqual(['inside_air', 'outside_air']);
            // a hierarchy under the group keeps its own sub-aspects
            expect(top[0].sub_aspects?.[0].sub_aspects?.map(a => a.name)).toEqual(['morning_air']);

            expect(component.isAspectClassGroup(top[1])).toBeFalse();
            expect(top[1].name).toBe('device');

            // it is still a root hierarchy, one level down: it may be saved and deleted on its own
            expect(component.isRootNode(top[0].sub_aspects?.[1] as DeviceTypeAspectModel)).toBeTrue();
            expect(component.isRootNode(top[0])).toBeFalse();
            expect(component.treeControl.isExpanded(top[0])).toBeTrue();
        }),
    );

    it(
        'shows the class field only where it adds something',
        fakeAsync(() => {
            init([
                {id: 'urn:infai:ses:aspect:a', name: 'a',
                    aspect_class_id: 'urn:infai:ses:aspect-class:environment', sub_aspects: [
                        {id: 'urn:infai:ses:aspect:sub', name: 'sub', sub_aspects: []}]},
                {id: 'urn:infai:ses:aspect:b', name: 'b', sub_aspects: []},
            ]);

            // under a class row the field would only repeat the position
            expect(component.showsAspectClassField(rootByName('a'))).toBeFalse();
            // at the top level it is the way to assign a class
            expect(component.showsAspectClassField(rootByName('b'))).toBeTrue();
            // a sub-aspect never carries a class of its own; the root settles it
            expect(component.showsAspectClassField(
                rootByName('a').sub_aspects?.[0] as DeviceTypeAspectModel)).toBeFalse();

            // picking a class must not make the field vanish mid-edit: it asks where the node sits,
            // and that only changes when the tree is rebuilt after saving
            const b = rootByName('b');
            b.aspect_class_id = 'urn:infai:ses:aspect-class:environment';
            expect(component.showsAspectClassField(b)).toBeTrue();
        }),
    );

    it(
        'gives a class no aspect carries a row of its own',
        fakeAsync(() => {
            init(
                [{id: 'urn:infai:ses:aspect:b', name: 'b', sub_aspects: []}],
                true,
                true,
                [{id: 'urn:infai:ses:aspect-class:empty', name: 'empty'}],
            );

            // without a row the class would be invisible, and the tree is the only place it is managed
            const group = groupByName('empty');
            expect(group).toBeDefined();
            expect(group.sub_aspects).toEqual([]);
            expect(component.aspectClassInUse(group)).toBeFalse();
        }),
    );

    it(
        'adds a new aspect to an existing class and opens the row',
        fakeAsync(() => {
            init(
                [{id: 'urn:infai:ses:aspect:b', name: 'b', sub_aspects: []}],
                true,
                true,
                [{id: 'urn:infai:ses:aspect-class:empty', name: 'empty'}],
            );

            component.addAspectToClass(groupByName('empty'));
            flush();

            const group = groupByName('empty');
            expect(group.sub_aspects?.length).toBe(1);
            // it starts unnamed and unsaved: the row is written when the user saves it
            expect(group.sub_aspects?.[0].name).toBe('');
            expect(group.sub_aspects?.[0].aspect_class_id).toBe('urn:infai:ses:aspect-class:empty');
            expect(group.sub_aspects?.[0].id).toBeUndefined();
            expect(component.treeControl.isExpanded(group)).toBeTrue();
            expect(component.isRootNode(group.sub_aspects?.[0] as DeviceTypeAspectModel)).toBeTrue();
        }),
    );

    it(
        'deletes a class no aspect carries and drops its row',
        fakeAsync(() => {
            init(
                [{id: 'urn:infai:ses:aspect:b', name: 'b', sub_aspects: []}],
                true,
                true,
                [{id: 'urn:infai:ses:aspect-class:empty', name: 'empty'}],
            );
            aspectClassesServiceSpy.deleteAspectClass.and.returnValue(of({deleted: true}));
            dialogReturns(true);

            component.deleteAspectClass(groupByName('empty'));
            flush();

            expect(aspectClassesServiceSpy.deleteAspectClass.calls.mostRecent().args[0])
                .toBe('urn:infai:ses:aspect-class:empty');
            expect(groupByName('empty')).toBeUndefined();
            expect(component.aspectClasses).toEqual([]);
            expect(rootByName('b')).toBeDefined();
        }),
    );

    it(
        'keeps the class and its row when the repository refuses the delete',
        fakeAsync(() => {
            init(airHierarchy());
            aspectClassesServiceSpy.deleteAspectClass.and.returnValue(
                of({deleted: false, error: 'still in use by 1 aspect(s): air (urn:infai:ses:aspect:air)'}),
            );
            dialogReturns(true);

            const group = groupByName('environment');
            // a class with members is blocked in the UI already, since the repository answers with 400
            expect(component.aspectClassInUse(group)).toBeTrue();

            component.deleteAspectClass(group);
            flush();

            expect(groupByName('environment')).toBeDefined();
            expect(component.aspectClasses.length).toBe(1);
        }),
    );

    it(
        'renames an aspect class from its group row and re-sorts the rows',
        fakeAsync(() => {
            init(
                [
                    {id: 'urn:infai:ses:aspect:a', name: 'a', aspect_class_id: 'urn:infai:ses:aspect-class:air',
                        sub_aspects: []},
                    {id: 'urn:infai:ses:aspect:b', name: 'b', aspect_class_id: 'urn:infai:ses:aspect-class:building',
                        sub_aspects: []},
                ],
                true,
                true,
                [
                    {id: 'urn:infai:ses:aspect-class:air', name: 'air'},
                    {id: 'urn:infai:ses:aspect-class:building', name: 'building'},
                ],
            );
            expect(component.dataSource.data.map(n => n.name)).toEqual(['air', 'building']);

            aspectClassesServiceSpy.updateAspectClass.and.callFake(
                (c: DeviceTypeAspectClassModel) => of(c));

            const airGroup = groupByName('air');
            airGroup.name = '  cleaning  ';
            component.saveAspectClass(airGroup);
            flush();

            const sent = aspectClassesServiceSpy.updateAspectClass.calls.mostRecent()
                .args[0] as DeviceTypeAspectClassModel;
            // the id in the body has to equal the one in the path, and the name comes trimmed
            expect(sent).toEqual({id: 'urn:infai:ses:aspect-class:air', name: 'cleaning'});
            // group rows are labelled and ordered from the class list, so both follow the rename
            expect(component.dataSource.data.map(n => n.name)).toEqual(['building', 'cleaning']);
        }),
    );

    it(
        'refuses a class name that another class already holds',
        fakeAsync(() => {
            init(
                [{id: 'urn:infai:ses:aspect:a', name: 'a', aspect_class_id: 'urn:infai:ses:aspect-class:air',
                    sub_aspects: []}],
                true,
                true,
                [
                    {id: 'urn:infai:ses:aspect-class:air', name: 'air'},
                    {id: 'urn:infai:ses:aspect-class:building', name: 'building'},
                ],
            );

            const airGroup = groupByName('air');
            airGroup.name = 'building';
            // the conversion helper resolves a class by name, so two of one name make that pick arbitrary
            expect(component.aspectClassNameTaken(airGroup)).toBeTrue();
            expect(component.aspectClassNameValid(airGroup)).toBeFalse();

            airGroup.name = '   ';
            expect(component.aspectClassNameValid(airGroup)).toBeFalse();

            airGroup.name = 'cleaning';
            expect(component.aspectClassNameValid(airGroup)).toBeTrue();
        }),
    );

    it(
        'puts the same controls in front of its name field as an aspect row does',
        fakeAsync(() => {
            init([
                {id: 'urn:infai:ses:aspect:a', name: 'a',
                    aspect_class_id: 'urn:infai:ses:aspect-class:environment', sub_aspects: []},
                {id: 'urn:infai:ses:aspect:p', name: 'p', sub_aspects: [
                    {id: 'urn:infai:ses:aspect:c', name: 'c', sub_aspects: []}]},
            ]);
            flush();
            fixture.detectChanges();

            const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.mat-tree-node');
            const groupField = rows[0].querySelector('mat-form-field') as HTMLElement;
            // an aspect row with children, which is the shape a group row always has
            const aspectRow = Array.from(rows).find(r => r.textContent?.includes('Toggle p')
                || r.querySelector('[aria-label="Toggle p"]') !== null) as HTMLElement;
            const aspectField = aspectRow?.querySelector('mat-form-field') as HTMLElement;
            expect(groupField).not.toBeNull();
            expect(aspectField).not.toBeNull();

            // what pushed the class name out of line was a bare mat-icon and a plain span where the
            // aspect rows carry two icon buttons and a form field. Comparing the controls in front of
            // the field is theme-independent; measuring offsets here is not, because karma loads no
            // material theme and an icon button then shrinks to its content.
            expect(tagsBefore(groupField)).toEqual(tagsBefore(aspectField));

            flush();
            discardPeriodicTasks();
        }),
    );

    it(
        'falls back to the class id when the class itself is unknown',
        fakeAsync(() => {
            init(
                [{id: 'urn:infai:ses:aspect:x', name: 'x', aspect_class_id: 'urn:infai:ses:aspect-class:gone',
                    sub_aspects: []}],
                true,
                true,
                [],
            );

            // an aspect whose class was deleted elsewhere has to stay visible
            expect(component.dataSource.data[0].name).toBe('urn:infai:ses:aspect-class:gone');
            expect(rootByName('x')).toBeDefined();
        }),
    );

    it(
        'joins an aspect to a class when it is dropped on the group row',
        fakeAsync(() => {
            const environmentClass = 'urn:infai:ses:aspect-class:environment';
            init([
                {id: 'urn:infai:ses:aspect:inside_air', name: 'inside_air', aspect_class_id: environmentClass,
                    sub_aspects: []},
                {id: 'urn:infai:ses:aspect:device', name: 'device', sub_aspects: []},
            ]);
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            dialogReturns(true);

            const group = groupByName('environment');
            const device = component.dataSource.data[1];
            component.dropped({item: {data: device}}, group);
            flush();

            // one write of the new root is enough; the repository takes it out of its old place
            expect(aspectsServiceSpy.updateAspects.calls.count()).toBe(1);
            const sent = writtenAspects()[0];
            expect(sent.id).toBe('urn:infai:ses:aspect:device');
            expect(sent.aspect_class_id).toBe(environmentClass);
        }),
    );

    it(
        'strips the class when an aspect is dropped on the root zone',
        fakeAsync(() => {
            init(airHierarchy());
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            dialogReturns(true);

            component.dropped({item: {data: rootByName('air')}});
            flush();

            const sent = writtenAspects()[0];
            expect(sent.id).toBe('urn:infai:ses:aspect:air');
            expect('aspect_class_id' in sent).toBeFalse();
        }),
    );

    it(
        'deletes a hierarchy that sits under a group row instead of treating it as a sub-aspect',
        fakeAsync(() => {
            init(airHierarchy());
            aspectsServiceSpy.deleteAspects.and.returnValue(of(true));

            component.deleteNode(rootByName('air'), true);
            flush();

            expect(aspectsServiceSpy.deleteAspects.calls.mostRecent().args[0]).toBe('urn:infai:ses:aspect:air');
            // the class row stays once its last member is gone — that row is where the class itself
            // is renamed and deleted, so it must not vanish with the aspects
            expect(component.dataSource.data.map(n => n.name)).toEqual(['environment']);
            expect(component.aspectClassInUse(component.dataSource.data[0])).toBeFalse();
        }),
    );

    it(
        'only removes a sub-aspect locally, leaving its root to be saved',
        fakeAsync(() => {
            init(airHierarchy());

            const inside = rootByName('air').sub_aspects?.[0] as DeviceTypeAspectModel;
            component.deleteNode(inside, true);
            flush();

            expect(aspectsServiceSpy.deleteAspects).not.toHaveBeenCalled();
            expect(rootByName('air').sub_aspects).toEqual([]);
        }),
    );

    it(
        'sends the aspect class only on the root and leaves the descendants to inherit it',
        fakeAsync(() => {
            init(airHierarchy());
            const root = rootByName('air');
            aspectsServiceSpy.updateAspects.and.returnValue(of(root));

            component.save(root);
            flush();

            const sent = aspectsServiceSpy.updateAspects.calls.mostRecent().args[0] as DeviceTypeAspectModel;
            expect(sent.aspect_class_id).toBe('urn:infai:ses:aspect-class:environment');
            expect('aspect_class_id' in (sent.sub_aspects || [])[0]).toBeFalse();
            expect('aspect_class_id' in ((sent.sub_aspects || [])[0].sub_aspects || [])[0]).toBeFalse();
            // the tree the user sees keeps what it read; only the request drops the inherited values
            expect(rootByName('air').sub_aspects?.[0].aspect_class_id)
                .toBe('urn:infai:ses:aspect-class:environment');
        }),
    );

    it(
        'converts a root aspect: children become roots of the new class, then the aspect goes',
        fakeAsync(() => {
            init([unclassifiedAir()]);
            aspectClassesServiceSpy.createAspectClass.and.returnValue(of(newClass));
            const order = recordWriteOrder();
            dialogReturns({className: 'air', fate: 'delete'});

            component.convertToAspectClass(rootByName('air'));
            flush();

            expect(aspectClassesServiceSpy.createAspectClass.calls.mostRecent().args[0]).toBe('air');
            // the order is load-bearing: while the children still hang off the aspect's node, the
            // repository answers its removal with "sub aspect … is still in use"
            expect(order).toEqual([
                'put:urn:infai:ses:aspect:inside_air',
                'put:urn:infai:ses:aspect:outside_air',
                'delete:urn:infai:ses:aspect:air',
            ]);

            const written = writtenAspects();
            expect(written.map(a => a.aspect_class_id)).toEqual([newClass.id, newClass.id]);
            // a child keeps its own sub-tree and its id, so device-types using it are unaffected
            expect(written[0].sub_aspects?.map(sub => sub.id)).toEqual(['urn:infai:ses:aspect:morning_air']);
        }),
    );

    it(
        'keeps the converted aspect as an empty root and marks it deprecated by name',
        fakeAsync(() => {
            init(nestedAir());
            aspectClassesServiceSpy.createAspectClass.and.returnValue(of(newClass));
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            dialogReturns({className: 'air', fate: 'deprecate'});

            const air = rootByName('environment').sub_aspects?.[0] as DeviceTypeAspectModel;
            component.convertToAspectClass(air);
            flush();

            const written = writtenAspects();
            expect(written.map(a => a.id)).toEqual([
                'urn:infai:ses:aspect:inside_air',
                'urn:infai:ses:aspect:outside_air',
                'urn:infai:ses:aspect:air',
            ]);
            expect(written[2].sub_aspects).toEqual([]);
            expect(written[2].aspect_class_id).toBe(newClass.id);
            // aspects carry no attributes, so the marker has to ride in the name
            expect(written[2].name).toBe('air (deprecated)');
            expect(component.deprecated(written[2])).toBeTrue();
            expect(aspectsServiceSpy.deleteAspects).not.toHaveBeenCalled();
        }),
    );

    it(
        'removes a converted sub-aspect from its root instead of deleting a hierarchy',
        fakeAsync(() => {
            init(nestedAir());
            aspectClassesServiceSpy.createAspectClass.and.returnValue(of(newClass));
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            dialogReturns({className: 'air', fate: 'delete'});

            const air = rootByName('environment').sub_aspects?.[0] as DeviceTypeAspectModel;
            component.convertToAspectClass(air);
            flush();

            const written = writtenAspects();
            // DELETE /aspects/{id} removes a whole hierarchy, so a sub-aspect goes by rewriting its root
            expect(aspectsServiceSpy.deleteAspects).not.toHaveBeenCalled();
            expect(written[written.length - 1].id).toBe('urn:infai:ses:aspect:environment');
            expect(written[written.length - 1].sub_aspects).toEqual([]);
        }),
    );

    it(
        'keeps the name untouched when the aspect is kept without the deprecated marker',
        fakeAsync(() => {
            init(nestedAir());
            aspectClassesServiceSpy.createAspectClass.and.returnValue(of(newClass));
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            dialogReturns({className: 'air', fate: 'keep'});

            const air = rootByName('environment').sub_aspects?.[0] as DeviceTypeAspectModel;
            component.convertToAspectClass(air);
            flush();

            const written = writtenAspects();
            expect(written[2].name).toBe('air');
            expect(component.deprecated(written[2])).toBeFalse();
        }),
    );

    it(
        'appends the marker only once when a deprecated aspect is converted again',
        fakeAsync(() => {
            const alreadyDeprecated = {...unclassifiedAir(), name: 'air (deprecated)'};
            init([alreadyDeprecated]);
            aspectClassesServiceSpy.createAspectClass.and.returnValue(of(newClass));
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            dialogReturns({className: 'air', fate: 'deprecate'});

            component.convertToAspectClass(rootByName('air (deprecated)'));
            flush();

            const written = writtenAspects();
            expect(written[written.length - 1].name).toBe('air (deprecated)');
        }),
    );

    it(
        'reuses an aspect class of the same name instead of creating a second one',
        fakeAsync(() => {
            init([unclassifiedAir()]);
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            aspectsServiceSpy.deleteAspects.and.returnValue(of(true));
            dialogReturns({className: 'environment', fate: 'delete'});

            component.convertToAspectClass(rootByName('air'));
            flush();

            expect(aspectClassesServiceSpy.createAspectClass).not.toHaveBeenCalled();
            expect(writtenAspects().map(a => a.aspect_class_id))
                .toEqual(['urn:infai:ses:aspect-class:environment', 'urn:infai:ses:aspect-class:environment']);
        }),
    );

    it(
        'offers the conversion only for an aspect that has children',
        fakeAsync(() => {
            init([unclassifiedAir()]);
            const air = rootByName('air');

            expect(component.convertible(air)).toBeTrue();
            expect(component.convertible(air.sub_aspects?.[1] as DeviceTypeAspectModel)).toBeFalse();
        }),
    );

    it(
        'creates an aspect class from the class field and keeps the list sorted',
        fakeAsync(() => {
            init(airHierarchy());
            aspectClassesServiceSpy.createAspectClass.and.returnValue(
                of({id: 'urn:infai:ses:aspect-class:building', name: 'building'}),
            );

            expect(typeof component.addAspectClass).toBe('function');
            let created: DeviceTypeAspectClassModel | undefined;
            (component.addAspectClass as (name: string) => Promise<DeviceTypeAspectClassModel>)('building')
                .then((c) => created = c);
            flush();

            expect(aspectClassesServiceSpy.createAspectClass.calls.mostRecent().args[0]).toBe('building');
            expect(created?.id).toBe('urn:infai:ses:aspect-class:building');
            // every root's field reads the same list, so the new class has to land in it
            expect(component.aspectClasses.map((c) => c.name)).toEqual(['building', 'environment']);
        }),
    );

    it(
        'offers no creation to a user who may not write aspect classes',
        fakeAsync(() => {
            init(airHierarchy(), false);

            // false is how ng-select is told there is nothing to offer
            expect(component.addAspectClass).toBeFalse();
        }),
    );

    it(
        'disables the class field for a user who may not change aspects',
        fakeAsync(() => {
            // the field only exists on a hierarchy that sits at the top level, not under a class row
            init([{id: 'urn:infai:ses:aspect:plain', name: 'plain', sub_aspects: []}], false, false);
            // [disabled] reaches the field through NgModel, which disables the control a microtask
            // later — asserting straight after the first render reads the un-disabled state
            flush();
            fixture.detectChanges();

            const select = fixture.debugElement.query(By.directive(MtxSelect));
            expect(select).not.toBeNull();
            expect((select.componentInstance as MtxSelect).disabled).toBeTrue();

            // rendering the field leaves material's own timers behind
            flush();
            discardPeriodicTasks();
        }),
    );

    it(
        'drops the class from the whole request when the root was cleared',
        fakeAsync(() => {
            init(airHierarchy());
            const root = rootByName('air');
            aspectsServiceSpy.updateAspects.and.returnValue(of(root));

            // clearing the select leaves null behind, and an unclassified hierarchy is written without
            // the field rather than with an empty one
            root.aspect_class_id = null;
            component.save(root);
            flush();

            const sent = aspectsServiceSpy.updateAspects.calls.mostRecent().args[0] as DeviceTypeAspectModel;
            expect('aspect_class_id' in sent).toBeFalse();
            expect('aspect_class_id' in (sent.sub_aspects || [])[0]).toBeFalse();
        }),
    );
});
