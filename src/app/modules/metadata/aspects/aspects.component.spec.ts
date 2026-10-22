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
import { MtxSelect, MtxSelectModule } from '@ng-matero/extensions/select';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of, Subject } from 'rxjs';

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

    let aspectsServiceSpy: Spy<AspectsService>;
    let aspectClassesServiceSpy: Spy<AspectClassesService>;
    let deviceTypeServiceSpy: Spy<DeviceTypeService>;
    let authServiceSpy: Spy<AuthorizationService>;
    let matDialogStub: {open: jasmine.Spy};

    // fresh spies per spec, so neither calls nor stubbed answers of one spec reach the next
    beforeEach(() => {
        aspectsServiceSpy = createSpyFromClass<AspectsService>(AspectsService);
        aspectClassesServiceSpy = createSpyFromClass<AspectClassesService>(AspectClassesService);
        deviceTypeServiceSpy = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
        authServiceSpy = createSpyFromClass<AuthorizationService>(AuthorizationService);
        matDialogStub = {open: jasmine.createSpy('open')};
    });

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
                MtxSelectModule,
                AspectsComponent,
            ],
            providers: [
                { provide: AspectsService, useValue: aspectsServiceSpy },
                { provide: AspectClassesService, useValue: aspectClassesServiceSpy },
                { provide: DeviceTypeService, useValue: deviceTypeServiceSpy },
                { provide: AuthorizationService, useValue: authServiceSpy },
                { provide: MatDialog, useValue: matDialogStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AspectsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

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
            // the field is part of the form of a hierarchy that sits at the top level, not under a class row
            init([{id: 'urn:infai:ses:aspect:plain', name: 'plain', sub_aspects: []}], false, false);
            component.select(rootByName('plain'));
            fixture.detectChanges();
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

    describe('request bodies', () => {
        const environmentClassId = 'urn:infai:ses:aspect-class:environment';

        function echoWrites() {
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            aspectsServiceSpy.createAspect.and.callFake((a: DeviceTypeAspectModel) => of({...a, id: 'urn:infai:ses:aspect:new'}));
        }

        afterEach(() => {
            aspectsServiceSpy.createAspect.calls.reset();
        });

        it('creates a new root hierarchy with the name only', fakeAsync(() => {
            init([]);
            echoWrites();

            component.newAspect();
            const added = rootAspects().find(a => a.id === undefined) as DeviceTypeAspectModel;
            added.name = 'speed';
            component.save(added);
            flush();

            expect(aspectsServiceSpy.updateAspects).not.toHaveBeenCalled();
            expect(aspectsServiceSpy.createAspect.calls.count()).toBe(1);
            expect(aspectsServiceSpy.createAspect.calls.mostRecent().args[0]).toEqual({name: 'speed'});
        }));

        it('creates a root inside a class with the class on the root', fakeAsync(() => {
            init([], true, true, [environmentClassEntry]);
            echoWrites();

            component.addAspectToClass(groupByName('environment'));
            const added = rootAspects().find(a => a.id === undefined) as DeviceTypeAspectModel;
            added.name = 'wind';
            component.save(added);
            flush();

            expect(aspectsServiceSpy.createAspect.calls.mostRecent().args[0])
                .toEqual({name: 'wind', aspect_class_id: environmentClassId});
        }));

        it('updates a root after a sub-aspect was renamed', fakeAsync(() => {
            init(airHierarchy());
            echoWrites();

            const root = rootByName('air');
            (root.sub_aspects as DeviceTypeAspectModel[])[0].name = 'indoor';
            component.save(root);
            flush();

            expect(aspectsServiceSpy.updateAspects.calls.count()).toBe(1);
            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:air',
                name: 'air',
                aspect_class_id: environmentClassId,
                sub_aspects: [{
                    id: 'urn:infai:ses:aspect:inside_air',
                    name: 'indoor',
                    sub_aspects: [{id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []}],
                }],
            });
        }));

        it('updates a root after a sub-aspect was added', fakeAsync(() => {
            init(airHierarchy());
            echoWrites();

            const root = rootByName('air');
            component.addSubNode(root);
            const added = (root.sub_aspects as DeviceTypeAspectModel[])[1];
            added.name = 'dry_air';
            component.save(root);
            // the tree keeps a polling task of its own after a sub-aspect was added
            discardPeriodicTasks();

            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:air',
                name: 'air',
                aspect_class_id: environmentClassId,
                sub_aspects: [
                    {
                        id: 'urn:infai:ses:aspect:inside_air',
                        name: 'inside_air',
                        sub_aspects: [{id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []}],
                    },
                    {name: 'dry_air'},
                ],
            });
        }));

        it('updates a root after a sub-aspect was deleted', fakeAsync(() => {
            init(airHierarchy());
            echoWrites();

            const root = rootByName('air');
            component.deleteNode((root.sub_aspects as DeviceTypeAspectModel[])[0], true);
            component.save(rootByName('air'));
            flush();

            expect(aspectsServiceSpy.deleteAspects).not.toHaveBeenCalled();
            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:air',
                name: 'air',
                aspect_class_id: environmentClassId,
                sub_aspects: [],
            });
        }));

        it('updates a root after its class was changed', fakeAsync(() => {
            init([unclassifiedAir()], true, true, [environmentClassEntry]);
            echoWrites();

            const root = rootByName('air');
            root.aspect_class_id = environmentClassId;
            component.save(root);
            flush();

            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:air',
                name: 'air',
                aspect_class_id: environmentClassId,
                sub_aspects: [
                    {
                        id: 'urn:infai:ses:aspect:inside_air',
                        name: 'inside_air',
                        sub_aspects: [{id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []}],
                    },
                    {id: 'urn:infai:ses:aspect:outside_air', name: 'outside_air', sub_aspects: []},
                ],
            });
        }));

        it('writes the target hierarchy with the moved aspect appended when dropped on an aspect', fakeAsync(() => {
            init([
                {id: 'urn:infai:ses:aspect:a', name: 'a', sub_aspects: [
                    {id: 'urn:infai:ses:aspect:a1', name: 'a1', sub_aspects: []}]},
                {id: 'urn:infai:ses:aspect:b', name: 'b', aspect_class_id: environmentClassId,
                    sub_aspects: [{id: 'urn:infai:ses:aspect:b1', name: 'b1', aspect_class_id: environmentClassId,
                        sub_aspects: []}]},
            ]);
            echoWrites();
            dialogReturns(true);

            component.dropped({item: {data: rootByName('b')}}, rootByName('a'));
            flush();

            expect(aspectsServiceSpy.updateAspects.calls.count()).toBe(1);
            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:a',
                name: 'a',
                sub_aspects: [
                    {id: 'urn:infai:ses:aspect:a1', name: 'a1', sub_aspects: []},
                    {id: 'urn:infai:ses:aspect:b', name: 'b', sub_aspects: [
                        {id: 'urn:infai:ses:aspect:b1', name: 'b1', sub_aspects: []}]},
                ],
            });
        }));

        it('writes the moved aspect with the class of the row it was dropped on', fakeAsync(() => {
            init([
                {id: 'urn:infai:ses:aspect:inside_air', name: 'inside_air', aspect_class_id: environmentClassId,
                    sub_aspects: []},
                {id: 'urn:infai:ses:aspect:device', name: 'device', sub_aspects: [
                    {id: 'urn:infai:ses:aspect:phone', name: 'phone', sub_aspects: []}]},
            ]);
            echoWrites();
            dialogReturns(true);

            component.dropped({item: {data: rootByName('device')}}, groupByName('environment'));
            flush();

            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:device',
                name: 'device',
                aspect_class_id: environmentClassId,
                sub_aspects: [{id: 'urn:infai:ses:aspect:phone', name: 'phone', sub_aspects: []}],
            });
        }));

        it('writes the moved aspect without a class when dropped on the root zone', fakeAsync(() => {
            init(airHierarchy());
            echoWrites();
            dialogReturns(true);

            component.dropped({item: {data: rootByName('air')}});
            flush();

            expect(aspectsServiceSpy.updateAspects.calls.mostRecent().args[0]).toEqual({
                id: 'urn:infai:ses:aspect:air',
                name: 'air',
                sub_aspects: [{
                    id: 'urn:infai:ses:aspect:inside_air',
                    name: 'inside_air',
                    sub_aspects: [{id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []}],
                }],
            });
        }));

        it('sends the whole body of each conversion step in order', fakeAsync(() => {
            init([unclassifiedAir()]);
            aspectClassesServiceSpy.createAspectClass.and.returnValue(of(newClass));
            echoWrites();
            aspectsServiceSpy.deleteAspects.and.returnValue(of(true));
            dialogReturns({className: 'air', fate: 'deprecate'});

            component.convertToAspectClass(rootByName('air'));
            flush();

            expect(writtenAspects()).toEqual([
                {
                    id: 'urn:infai:ses:aspect:inside_air',
                    name: 'inside_air',
                    aspect_class_id: newClass.id,
                    sub_aspects: [{id: 'urn:infai:ses:aspect:morning_air', name: 'morning_air', sub_aspects: []}],
                },
                {id: 'urn:infai:ses:aspect:outside_air', name: 'outside_air', aspect_class_id: newClass.id,
                    sub_aspects: []},
                {id: 'urn:infai:ses:aspect:air', name: 'air (deprecated)', aspect_class_id: newClass.id,
                    sub_aspects: []},
            ]);
        }));
    });

    describe('tree with detail', () => {
        const environmentClassId = 'urn:infai:ses:aspect-class:environment';

        function echoWrites() {
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) => of(a));
            aspectsServiceSpy.createAspect.and.callFake((a: DeviceTypeAspectModel) => of({...a, id: 'urn:infai:ses:aspect:new'}));
        }

        function twoRoots(): DeviceTypeAspectModel[] {
            return [
                ...airHierarchy(),
                {id: 'urn:infai:ses:aspect:device', name: 'device', sub_aspects: [
                    {id: 'urn:infai:ses:aspect:phone', name: 'phone', sub_aspects: []}]},
            ];
        }

        afterEach(() => {
            aspectsServiceSpy.createAspect.calls.reset();
            aspectClassesServiceSpy.updateAspectClass.calls.reset();
            aspectsServiceSpy.updateAspects.calls.reset();
            deviceTypeServiceSpy.getAspects.calls.reset();
        });

        it('is clean after loading and follows an edit and its undoing', fakeAsync(() => {
            init(airHierarchy());
            expect(component.hasUnsaved()).toBeFalse();

            const inside = rootByName('air').sub_aspects?.[0] as DeviceTypeAspectModel;
            component.renameNode(inside, 'indoor');
            expect(component.hasUnsaved()).toBeTrue();
            expect(component.dirtyRoots).toEqual([rootByName('air')]);
            expect(component.saveBlocked).toBeFalse();

            component.renameNode(inside, 'inside_air');
            expect(component.hasUnsaved()).toBeFalse();
            discardPeriodicTasks();
        }));

        it('writes every edited hierarchy and renamed class once and nothing else', fakeAsync(() => {
            init(twoRoots(), true, true, [environmentClassEntry]);
            echoWrites();
            aspectClassesServiceSpy.updateAspectClass.and.callFake((c: DeviceTypeAspectClassModel) => of(c));

            component.renameNode(rootByName('air'), 'atmosphere');
            component.renameAspectClass(groupByName('environment'), '  surroundings ');
            component.saveAll();
            flush();

            expect(writtenAspects().map(a => a.id)).toEqual(['urn:infai:ses:aspect:air']);
            expect(writtenAspects()[0].name).toBe('atmosphere');
            expect(aspectClassesServiceSpy.updateAspectClass.calls.count()).toBe(1);
            expect(aspectClassesServiceSpy.updateAspectClass.calls.mostRecent().args[0])
                .toEqual({id: environmentClassId, name: 'surroundings'});
            expect(component.hasUnsaved()).toBeFalse();
        }));

        it('sends the same body as saving one hierarchy for each edited hierarchy', fakeAsync(() => {
            init(twoRoots());
            echoWrites();

            component.renameNode(rootByName('device'), 'gadget');
            component.addSubNode(rootByName('air'));
            component.renameNode(component.selected as DeviceTypeAspectModel, 'dry_air');
            component.saveAll();
            discardPeriodicTasks();

            expect(writtenAspects().length).toBe(2);
            const air = writtenAspects().find(a => a.id === 'urn:infai:ses:aspect:air') as DeviceTypeAspectModel;
            expect(air.sub_aspects?.map(a => a.name)).toEqual(['inside_air', 'dry_air']);
            expect(air.aspect_class_id).toBe(environmentClassId);
            const device = writtenAspects().find(a => a.id === 'urn:infai:ses:aspect:device') as DeviceTypeAspectModel;
            expect(device).toEqual({id: 'urn:infai:ses:aspect:device', name: 'gadget',
                sub_aspects: [{id: 'urn:infai:ses:aspect:phone', name: 'phone', sub_aspects: []}]});
        }));

        it('keeps a failed hierarchy dirty and still writes the others', fakeAsync(() => {
            init(twoRoots());
            aspectsServiceSpy.updateAspects.and.callFake((a: DeviceTypeAspectModel) =>
                of(a.id === 'urn:infai:ses:aspect:air' ? null : a));

            component.renameNode(rootByName('air'), 'atmosphere');
            component.renameNode(rootByName('device'), 'gadget');
            component.saveAll();
            flush();

            expect(aspectsServiceSpy.updateAspects.calls.count()).toBe(2);
            expect(component.dirtyRoots.map(r => r.name)).toEqual(['atmosphere']);
            expect(component.saving).toBeFalse();
        }));

        it('blocks saving while a name is empty and says why', fakeAsync(() => {
            init(airHierarchy());
            component.renameNode(rootByName('air'), '');

            expect(component.saveBlocked).toBeTrue();
            expect(component.saveStatus).toBe('Every aspect needs a name.');
            component.saveAll();
            expect(aspectsServiceSpy.updateAspects).not.toHaveBeenCalled();
        }));

        it('blocks saving a class name another class holds', fakeAsync(() => {
            init(airHierarchy(), true, true, [environmentClassEntry, {id: 'urn:infai:ses:aspect-class:b', name: 'building'}]);
            component.renameAspectClass(groupByName('environment'), 'building');

            expect(component.saveBlocked).toBeTrue();
            component.saveAll();
            expect(aspectClassesServiceSpy.updateAspectClass).not.toHaveBeenCalled();
        }));

        it('keeps a typed class name when the tree is rebuilt before it is saved', fakeAsync(() => {
            init(airHierarchy(), true, true, [environmentClassEntry]);
            component.renameAspectClass(groupByName('environment'), 'surroundings');

            component.newAspect();
            flush();

            expect(groupByName('surroundings')).toBeDefined();
            expect(component.dirtyClasses.length).toBe(1);
        }));

        it('discards by reloading and forgets class names too', fakeAsync(() => {
            init(airHierarchy(), true, true, [environmentClassEntry]);
            component.renameNode(rootByName('air'), 'atmosphere');
            component.renameAspectClass(groupByName('environment'), 'surroundings');
            component.newAspect();
            // the repository answers with what is stored, not with the objects the form edited
            deviceTypeServiceSpy.getAspects.and.callFake(() => of(airHierarchy()));
            deviceTypeServiceSpy.getAspects.calls.reset();

            component.discard();
            flush();

            expect(deviceTypeServiceSpy.getAspects.calls.count()).toBe(1);
            expect(component.hasUnsaved()).toBeFalse();
            expect(rootByName('air').name).toBe('air');
            expect(groupByName('environment')).toBeDefined();
            expect(component.selected).toBeUndefined();
        }));

        it('refuses to move or convert while edits are unsaved', fakeAsync(() => {
            init(twoRoots());
            echoWrites();
            dialogReturns({className: 'x', fate: 'delete'});
            component.renameNode(rootByName('device'), 'gadget');

            component.dropped({item: {data: rootByName('air')}});
            component.convertToAspectClass(rootByName('device'));
            flush();

            expect(aspectsServiceSpy.updateAspects).not.toHaveBeenCalled();
            expect(matDialogStub.open).not.toHaveBeenCalled();
            expect(component.dragDisabled(rootByName('air'))).toBeTrue();
        }));

        it('selects a new aspect and a new sub-aspect and counts them as unsaved', fakeAsync(() => {
            init(airHierarchy());

            component.newAspect();
            const added = component.selected as DeviceTypeAspectModel;
            expect(added.id).toBeUndefined();
            expect(rootAspects()).toContain(added);
            expect(component.saveBlocked).toBeTrue();

            component.addSubNode(rootByName('air'));
            expect(component.selected).toBe((rootByName('air').sub_aspects as DeviceTypeAspectModel[])[1]);
            discardPeriodicTasks();
        }));

        it('moves the open form to the saved hierarchy when a new aspect gets its id', fakeAsync(() => {
            init([]);
            echoWrites();

            component.newAspect();
            component.renameNode(component.selected as DeviceTypeAspectModel, 'speed');
            component.saveAll();
            flush();

            expect(component.selected?.id).toBe('urn:infai:ses:aspect:new');
            expect(component.selected).toBe(rootByName('speed'));
            expect(component.hasUnsaved()).toBeFalse();
        }));

        it('finds the open class form again after the tree was rebuilt', fakeAsync(() => {
            init(airHierarchy(), true, true, [environmentClassEntry]);
            component.select(groupByName('environment'));

            component.addAspectToClass(groupByName('environment'));
            component.select(groupByName('environment'));
            component.newAspect();
            flush();

            expect(component.selected).toBe(rootAspects().find(a => a.id === undefined && a.aspect_class_id === undefined));
            component.select(groupByName('environment'));
            component.deleteNode(rootAspects().find(a => a.id === undefined && a.aspect_class_id === undefined) as DeviceTypeAspectModel, true);
            flush();
            expect(component.selected).toBe(groupByName('environment'));
        }));

        it('shows labels instead of fields in the tree and a row menu to an administrator', fakeAsync(() => {
            init(airHierarchy(), true, true, [environmentClassEntry]);
            fixture.detectChanges();
            flush();
            fixture.detectChanges();

            const el = fixture.nativeElement as HTMLElement;
            const tree = el.querySelector('.aspects-tree') as HTMLElement;
            expect(tree.querySelectorAll('input, mat-form-field').length).toBe(0);
            expect(tree.querySelector('.tree-label')?.textContent).toContain('environment');
            expect(tree.querySelectorAll('.row-menu').length).toBeGreaterThan(0);
            expect(tree.querySelectorAll('.drag-handle').length).toBeGreaterThan(0);
            expect(el.querySelector('senergy-save-bar')).toBeNull();
            discardPeriodicTasks();
        }));

        it('gives a read-only user no menu, handle, save bar or header action', fakeAsync(() => {
            init(airHierarchy(), false, false, [environmentClassEntry]);
            aspectClassesServiceSpy.userHasDeleteAuthorization.and.returnValue(false);
            fixture = TestBed.createComponent(AspectsComponent);
            fixture.detectChanges();
            flush();
            fixture.detectChanges();

            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelectorAll('.row-menu').length).toBe(0);
            expect(el.querySelectorAll('.drag-handle').length).toBe(0);
            expect(el.querySelector('senergy-save-bar')).toBeNull();
            expect(el.querySelector('senergy-page-header button')).toBeNull();
            discardPeriodicTasks();
        }));

        it('opens the form of the clicked row and offers the save bar once something changed', fakeAsync(() => {
            init(airHierarchy());
            fixture.detectChanges();
            flush();
            fixture.detectChanges();
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('senergy-empty-state')).not.toBeNull();

            (el.querySelector('.tree-row') as HTMLElement).click();
            fixture.detectChanges();
            flush();
            fixture.detectChanges();
            expect(component.selected).toBeDefined();
            expect(el.querySelector('senergy-form-section input')).not.toBeNull();

            component.renameAspectClass(component.selected as DeviceTypeAspectModel, 'x');
            fixture.detectChanges();
            expect(el.querySelector('senergy-save-bar')).not.toBeNull();
            discardPeriodicTasks();
        }));

        describe('review findings', () => {
            const otherClass = {id: 'urn:infai:ses:aspect-class:b', name: 'building'};

            function settle() {
                fixture.detectChanges();
                flush();
                fixture.detectChanges();
            }

            it('blocks saving when two classes are renamed to the same name', fakeAsync(() => {
                init(airHierarchy(), true, true, [environmentClassEntry, otherClass]);
                aspectClassesServiceSpy.updateAspectClass.and.callFake((c: DeviceTypeAspectClassModel) => of(c));

                component.renameAspectClass(groupByName('environment'), 'same');
                component.renameAspectClass(groupByName('building'), 'same');

                expect(component.saveBlocked).toBeTrue();
                expect(component.saveStatus).toBe('An aspect class needs a name that no other class has.');
                component.saveAll();
                flush();
                expect(aspectClassesServiceSpy.updateAspectClass).not.toHaveBeenCalled();
                discardPeriodicTasks();
            }));

            it('does not count a stored class name with blanks as renamed and trims a real rename', fakeAsync(() => {
                init(airHierarchy(), true, true, [{id: environmentClassId, name: 'environment '}]);
                aspectClassesServiceSpy.updateAspectClass.and.callFake((c: DeviceTypeAspectClassModel) => of(c));
                settle();

                expect(component.hasUnsaved()).toBeFalse();
                expect((fixture.nativeElement as HTMLElement).querySelector('senergy-save-bar')).toBeNull();
                component.saveAll();
                expect(aspectClassesServiceSpy.updateAspectClass).not.toHaveBeenCalled();

                component.renameAspectClass(groupByName('environment '), ' surroundings ');
                component.saveAll();
                flush();
                expect(aspectClassesServiceSpy.updateAspectClass.calls.allArgs())
                    .toEqual([[{id: environmentClassId, name: 'surroundings'}]]);
                discardPeriodicTasks();
            }));

            it('does not count a class rename as unsaved without the class update right', fakeAsync(() => {
                init(airHierarchy());
                aspectClassesServiceSpy.userHasUpdateAuthorization.and.returnValue(false);
                fixture = TestBed.createComponent(AspectsComponent);
                component = fixture.componentInstance;
                settle();

                component.renameAspectClass(groupByName('environment'), 'surroundings');

                expect(component.hasUnsaved()).toBeFalse();
                aspectClassesServiceSpy.userHasUpdateAuthorization.and.returnValue(true);
                discardPeriodicTasks();
            }));

            it('refuses a second create and keeps the root while a save is out', fakeAsync(() => {
                init(airHierarchy());
                const answer = new Subject<DeviceTypeAspectModel | null>();
                aspectsServiceSpy.createAspect.and.returnValue(answer.asObservable());

                component.newAspect();
                component.renameNode(component.selected as DeviceTypeAspectModel, 'speed');
                component.saveAll();
                settle();
                const el = fixture.nativeElement as HTMLElement;
                expect((el.querySelector('senergy-page-header button') as HTMLButtonElement).disabled).toBeTrue();
                expect((el.querySelector('senergy-form-section input') as HTMLInputElement).disabled).toBeTrue();
                expect((el.querySelector('.row-menu') as HTMLButtonElement).disabled).toBeTrue();
                expect(component.dragDisabled(rootByName('air'))).toBeTrue();

                component.deleteNode((rootByName('air').sub_aspects as DeviceTypeAspectModel[])[0], true);
                component.newAspect();
                answer.next({id: 'urn:infai:ses:aspect:new', name: 'speed'});
                answer.complete();
                flush();
                component.saveAll();
                flush();

                expect(rootByName('air').sub_aspects?.length).toBe(1);
                expect(rootByName('speed').id).toBe('urn:infai:ses:aspect:new');
                expect(aspectsServiceSpy.createAspect.calls.count()).toBe(1);
                expect(component.hasUnsaved()).toBeFalse();
                discardPeriodicTasks();
            }));

            it('does not take an edit of the saving hierarchy while its request is out', fakeAsync(() => {
                init(airHierarchy());
                const answer = new Subject<DeviceTypeAspectModel | null>();
                aspectsServiceSpy.updateAspects.and.returnValue(answer.asObservable());

                component.renameNode(rootByName('air'), 'atmosphere');
                component.saveAll();
                component.renameNode(rootByName('air'), 'atmosphere2');
                answer.next({...airHierarchy()[0], name: 'atmosphere'});
                answer.complete();
                flush();

                expect(rootByName('atmosphere')).toBeDefined();
                expect(component.hasUnsaved()).toBeFalse();
                discardPeriodicTasks();
            }));

            it('keeps the convert item visible but not usable while a name is empty', fakeAsync(() => {
                init([{id: 'urn:infai:ses:aspect:p', name: 'p',
                    sub_aspects: [{id: 'urn:infai:ses:aspect:c', name: '', sub_aspects: []}]}], true, true, []);
                dialogReturns({className: 'x', fate: 'delete'});
                settle();
                const el = fixture.nativeElement as HTMLElement;
                (el.querySelector('.row-menu') as HTMLElement).click();
                settle();
                const item = Array.from(document.querySelectorAll('.mat-mdc-menu-item'))
                    .find(i => i.textContent?.includes('Convert to aspect class')) as HTMLButtonElement;
                expect(item).toBeDefined();
                expect(item.disabled).toBeTrue();
                expect(document.querySelector('.menu-note')?.textContent).toContain('Name every aspect');

                component.convertToAspectClass(rootByName('p'));
                expect(matDialogStub.open).not.toHaveBeenCalled();
                discardPeriodicTasks();
            }));

            it('is clean after adding and deleting a sub-aspect of a leaf without sub_aspects', fakeAsync(() => {
                init([{id: 'urn:infai:ses:aspect:x', name: 'x', sub_aspects: null as unknown as undefined}]);

                component.addSubNode(rootByName('x'));
                expect(component.hasUnsaved()).toBeTrue();
                component.deleteNode((rootByName('x').sub_aspects as DeviceTypeAspectModel[])[0], true);

                expect(component.hasUnsaved()).toBeFalse();
                discardPeriodicTasks();
            }));

            it('allows neither save nor edits while a discard reload is pending', fakeAsync(() => {
                init(airHierarchy());
                echoWrites();
                component.renameNode(rootByName('air'), 'atmosphere');
                const answer = new Subject<DeviceTypeAspectModel[]>();
                deviceTypeServiceSpy.getAspects.and.returnValue(answer.asObservable());

                component.discard();
                settle();
                const bar = (fixture.nativeElement as HTMLElement).querySelector('senergy-save-bar');
                expect(bar).not.toBeNull();
                expect(Array.from(bar?.querySelectorAll('button') || []).every(b => b.disabled)).toBeTrue();
                component.saveAll();
                component.renameNode(rootByName('atmosphere'), 'late');
                expect(aspectsServiceSpy.updateAspects).not.toHaveBeenCalled();

                answer.next(airHierarchy());
                answer.complete();
                flush();
                expect(component.hasUnsaved()).toBeFalse();
                expect(rootByName('air')).toBeDefined();
                discardPeriodicTasks();
            }));

            it('selects the focused tree row with Enter and Space and marks it selected', fakeAsync(() => {
                init(twoRoots(), true, true, [environmentClassEntry]);
                settle();
                const el = fixture.nativeElement as HTMLElement;
                const rows = Array.from(el.querySelectorAll('[role="treeitem"]')) as HTMLElement[];
                const device = rows.find(r => r.textContent?.includes('device')) as HTMLElement;

                device.focus();
                device.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
                settle();
                expect(component.selected).toBe(rootByName('device'));
                expect(device.getAttribute('aria-selected')).toBe('true');

                const first = rows[0];
                first.focus();
                first.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
                settle();
                expect(component.selected).toBe(groupByName('environment'));
                discardPeriodicTasks();
            }));
        });
    });
});
