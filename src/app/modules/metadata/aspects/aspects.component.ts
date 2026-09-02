/*
 * Copyright 2021 InfAI (CC SES)
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

import { Component, OnInit, ViewChild } from '@angular/core';
import { concat, Observable, of } from 'rxjs';
import { concatMap, map, tap, toArray } from 'rxjs/operators';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AspectsService } from './shared/aspects.service';
import { AspectClassesService } from './shared/aspect-classes.service';
import {
    AspectFate,
    AspectToClassDialogComponent,
    AspectToClassDialogData,
    AspectToClassDialogResult
} from './dialog/aspect-to-class-dialog.component';
import {
    aspectIsDeprecated,
    deprecatedAspectName,
    DeviceTypeAspectClassModel,
    DeviceTypeAspectModel,
    withoutDeprecatedSuffix
} from '../device-types-overview/shared/device-type.model';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTree, MatTreeNestedDataSource } from '@angular/material/tree';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from '../device-types-overview/shared/used-in-device-type.model';

/**
 * A row that stands for an aspect class rather than an aspect. It is shaped like an aspect so the
 * tree control, `hasChild` and the drag-and-drop wiring keep working unchanged; `id` is the class id
 * and `sub_aspects` are the root hierarchies carrying that class.
 */
export interface AspectClassGroupNode extends DeviceTypeAspectModel {
    is_aspect_class_group: true;
}

@Component({
    selector: 'senergy-aspects',
    templateUrl: './aspects.component.html',
    styleUrls: ['./aspects.component.css'],
})
export class AspectsComponent implements OnInit {
    ready = false;

    treeControl = new NestedTreeControl<DeviceTypeAspectModel>((node) => node.sub_aspects);
    dataSource = new MatTreeNestedDataSource<DeviceTypeAspectModel>();

    @ViewChild(MatTree, {static: false}) tree!: MatTree<DeviceTypeAspectModel>;
    hasChild = (_: number, node: DeviceTypeAspectModel) => !!node.sub_aspects && node.sub_aspects.length > 0;
    isGroupRow = (_: number, node: DeviceTypeAspectModel) => this.isAspectClassGroup(node);
    userIsAdmin = false;

    userHasUsedInAuthorization = false;
    userHasAspectClassReadAuthorization = false;
    userHasAspectClassUpdateAuthorization = false;
    userHasAspectClassDeleteAuthorization = false;

    aspectClasses: DeviceTypeAspectClassModel[] = [];
    /**
     * Handed to the class field so a name that is not in the list yet can be created from there.
     * `false` is ng-select's way of switching the offer off, which is what a non-admin gets:
     * creating an aspect-class is admin-only in the device-repository.
     */
    addAspectClass: ((name: string) => Promise<DeviceTypeAspectClassModel>) | false = false;

    dragging = false;

    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();

    constructor(
        private dialog: MatDialog,
        private responsiveService: ResponsiveService,
        private aspectsService: AspectsService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
        private deviceTypesService: DeviceTypeService,
        private aspectClassesService: AspectClassesService,
    ) {
    }

    ngOnInit() {
        this.checkAuthorization();
        this.userIsAdmin = this.authService.userIsAdmin();
        // the class names label the group rows, so they have to be there before the tree is built
        this.getAspectClasses().subscribe(() => this.getAspects());
    }

    checkAuthorization() {
        this.userHasUsedInAuthorization = this.deviceTypesService.userHasUsedInAuthorization();
        this.userHasAspectClassReadAuthorization = this.aspectClassesService.userHasReadAuthorization();
        this.userHasAspectClassUpdateAuthorization = this.aspectClassesService.userHasUpdateAuthorization();
        this.userHasAspectClassDeleteAuthorization = this.aspectClassesService.userHasDeleteAuthorization();
        if (this.aspectClassesService.userHasCreateAuthorization()) {
            this.addAspectClass = (name: string) => this.createAspectClass(name);
        }
    }

    /**
     * Writes the class right away rather than when the aspect is saved: the field hands the created
     * item back to the select, which has no way to hold an unsaved one. A class nobody ends up using
     * is harmless — it blocks nothing and is free to reuse.
     */
    private createAspectClass(name: string): Promise<DeviceTypeAspectClassModel> {
        return new Promise((resolve, reject) => {
            this.aspectClassesService.createAspectClass(name.trim()).subscribe((created) => {
                if (created === null) {
                    this.snackBar.open('Error while creating the aspect class!', 'close', { panelClass: 'snack-bar-error' });
                    // ng-select swallows a rejected promise, so the message above is the only report
                    reject();
                    return;
                }
                this.addToAspectClassList(created);
                this.snackBar.open('Aspect class created successfully.', undefined, {duration: 2000});
                resolve(created);
            });
        });
    }

    newAspect(): void {
        this.setTree([...this.rootAspects(), {name: ''} as DeviceTypeAspectModel]);
    }

    addSubNode(node: DeviceTypeAspectModel) {
        node.sub_aspects = node.sub_aspects || [];
        node.sub_aspects.push({name: ''} as DeviceTypeAspectModel);
        this.treeControl.expand(node);
        this.redraw();
    }

    /**
     * A root hierarchy goes through DELETE; a sub-aspect only leaves the local tree, and the user
     * saves its root afterwards. Which of the two a node is now depends on the real roots, not on the
     * top level of the displayed tree — a classified hierarchy sits under its group row.
     */
    deleteNode(node: DeviceTypeAspectModel, skipDialog = false) {
        const del = (confirmed: boolean) => {
            if (!confirmed) {
                return;
            }
            if (!this.isRootNode(node)) {
                this.setTree(this.rootAspects().map(root => this.withoutSubAspectNode(root, node)));
                return;
            }
            if (node.id === undefined) {
                this.setTree(this.rootAspects().filter(root => root !== node));
                return;
            }
            this.aspectsService.deleteAspects(node.id).subscribe((resp: boolean) => {
                if (resp === true) {
                    this.setTree(this.rootAspects().filter(root => root !== node));
                    this.snackBar.open('Aspect deleted successfully.', undefined, {duration: 2000});
                } else {
                    this.snackBar.open('Error while deleting the aspect!', 'close', { panelClass: 'snack-bar-error' });
                }
            });
        };

        if (skipDialog) {
            del(true);
        } else {
            this.dialogsService
                .openDeleteDialog('aspect ' + node.name + ' and all sub aspects')
                .afterClosed()
                .subscribe(del);
        }
    }

    private withoutSubAspectNode(node: DeviceTypeAspectModel, remove: DeviceTypeAspectModel): DeviceTypeAspectModel {
        const copy: DeviceTypeAspectModel = { ...node };
        if (node.sub_aspects !== undefined && node.sub_aspects !== null) {
            copy.sub_aspects = node.sub_aspects
                .filter(sub => sub !== remove)
                .map(sub => this.withoutSubAspectNode(sub, remove));
        }
        return copy;
    }

    nodeValid(node: DeviceTypeAspectModel): boolean {
        if (node.name.length === 0) {
            return false;
        }
        for (const n of node.sub_aspects || []) {
            if (!this.nodeValid(n)) {
                return false;
            }
        }
        return true;
    }

    isRootNode(node: DeviceTypeAspectModel): boolean {
        return !this.isAspectClassGroup(node) && this.rootAspects().some(root => root === node);
    }

    save(node: DeviceTypeAspectModel) {
        const request = this.aspectWriteRequest(node);
        let obs: Observable<DeviceTypeAspectModel | null> | undefined;
        if (node.id === undefined) {
            obs = this.aspectsService.createAspect(request);
        } else {
            obs = this.aspectsService.updateAspects(request);
        }

        obs.subscribe((resp: DeviceTypeAspectModel | null) => {
            if (resp === null) {
                this.snackBar.open('Error while saving the aspect!', 'close', { panelClass: 'snack-bar-error' });
            } else {
                // regrouping rather than replacing in place: a class the user just changed puts the
                // hierarchy under a different group row
                this.setTree(this.rootAspects().map(root => root === node ? resp : root));
                this.snackBar.open('Aspect saved successfully.', undefined, {duration: 2000});
            }
        });
    }

    dropped($event: any, target?: DeviceTypeAspectModel) {
        const node = $event.item.data as DeviceTypeAspectModel;
        if (node === target) {
            this.snackBar.open('Can\'t move aspect into itself', 'close', { panelClass: 'snack-bar-error' });
            return;
        }
        if (target !== undefined && !this.isAspectClassGroup(target) && !this.nodeValid(target)) {
            this.snackBar.open('Can\'t move into invalid aspect', 'close', { panelClass: 'snack-bar-error' });
            return;
        }
        if (target !== undefined && this.hasDescendant(node, target)) {
            this.snackBar.open('Can\'t move into descendant aspect', 'close', { panelClass: 'snack-bar-error' });
            return;
        }
        this.dialogsService.openConfirmDialog('Move Aspect', 'Do you want to move this aspect? Changes will be saved immediately').afterClosed().subscribe(move => {
            if (!move) {
                return;
            }
            this.moveAspect(node, target);
        });
    }

    /**
     * One write does a move. Whatever becomes the aspect's new root is written, and the repository
     * takes it out of its old hierarchy on its own — `handleMovedSubAspects` rewrites the source tree
     * including its aspect-nodes. The tree is reloaded afterwards because that server-side cleanup is
     * not visible in the local copy.
     */
    private moveAspect(node: DeviceTypeAspectModel, target?: DeviceTypeAspectModel) {
        const clone = JSON.parse(JSON.stringify(node)) as DeviceTypeAspectModel;
        let request: DeviceTypeAspectModel;

        if (target === undefined) {
            // dropped on the root zone: its own hierarchy, carrying no class
            request = {...clone, aspect_class_id: undefined};
        } else if (this.isAspectClassGroup(target)) {
            // dropped on a group row: its own hierarchy, carrying that class
            request = {...clone, aspect_class_id: target.id};
        } else {
            const targetRoot = this.isRootNode(target) ? target : this.findRoot(target);
            if (targetRoot === undefined) {
                this.snackBar.open('Can\'t find the root of the target aspect', 'close', { panelClass: 'snack-bar-error' });
                return;
            }
            const withNode = this.withSubAspect(targetRoot, target, clone);
            request = withNode;
        }

        this.ready = false;
        this.aspectsService.updateAspects(this.aspectWriteRequest(request)).subscribe((resp) => {
            if (resp === null) {
                this.snackBar.open('Error while moving the aspect!', 'close', { panelClass: 'snack-bar-error' });
            } else {
                this.snackBar.open('Aspect moved successfully.', undefined, {duration: 2000});
            }
            this.getAspects();
        });
    }

    private withSubAspect(
        node: DeviceTypeAspectModel,
        parent: DeviceTypeAspectModel,
        added: DeviceTypeAspectModel,
    ): DeviceTypeAspectModel {
        const copy: DeviceTypeAspectModel = { ...node };
        const subs = (node.sub_aspects || []).map(sub => this.withSubAspect(sub, parent, added));
        copy.sub_aspects = node === parent ? [...subs, added] : subs;
        return copy;
    }

    dragStart() {
        this.dragging = true;
    }

    dragEnd() {
        this.dragging = false;
    }

    hasDescendant(node: DeviceTypeAspectModel, descendant: DeviceTypeAspectModel): boolean {
        for (const child of node.sub_aspects || []) {
            if (child === descendant || this.hasDescendant(child, descendant)) {
                return true;
            }
        }
        return false;
    }

    findRoot(node: DeviceTypeAspectModel): DeviceTypeAspectModel | undefined {
        return this.rootAspects().find(root => this.hasDescendant(root, node));
    }

    /**
     * The class field belongs on a hierarchy that sits at the top level, where it is the way to assign
     * a class. Under a class row the field would only repeat what the position already says, so it is
     * dropped there — changing the class of a grouped hierarchy is a move onto another class row.
     *
     * This asks where the node sits, not what it carries: the field binds `aspect_class_id` with
     * ngModel, and reading that back would make the field disappear the moment a class is picked.
     */
    showsAspectClassField(node: DeviceTypeAspectModel): boolean {
        if (!this.userHasAspectClassReadAuthorization || !this.isRootNode(node)) {
            return false;
        }
        return !this.dataSource.data.some(top => this.isAspectClassGroup(top)
            && (top.sub_aspects || []).some(sub => sub === node));
    }

    /** An aspect an aspect class has replaced; the marker rides in its name, see the model. */
    deprecated(node: DeviceTypeAspectModel): boolean {
        return aspectIsDeprecated(node);
    }

    convertible(node: DeviceTypeAspectModel): boolean {
        return this.userIsAdmin
            && this.userHasAspectClassReadAuthorization
            && !this.isAspectClassGroup(node)
            && (node.sub_aspects || []).length > 0;
    }

    /**
     * Turns an aspect into an aspect class: its direct children become root hierarchies of their own
     * carrying that class, and the aspect itself is either deleted or kept as an empty root.
     *
     * The children keep their ids, so device-types referencing them are untouched. Writing a child as
     * a root is enough to take it out of its old tree — `handleMovedSubAspects` in the device
     * repository rewrites the source hierarchy, including its aspect-nodes. That is also why the
     * aspect itself has to be dealt with last: only once the children are gone from its node does its
     * removal stop being reported as deleting sub-aspects that are still in use.
     */
    convertToAspectClass(node: DeviceTypeAspectModel) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            aspectName: node.name,
            // an aspect already marked deprecated must not pass that marker on to the class it becomes
            proposedClassName: withoutDeprecatedSuffix(node.name),
            childNames: (node.sub_aspects || []).map(sub => sub.name),
            existingClassNames: this.aspectClasses.map(c => c.name),
            usedInCount: this.userHasUsedInAuthorization ? (this.usedIn.get(node.id)?.count || 0) : undefined,
        } as AspectToClassDialogData;

        this.dialog
            .open(AspectToClassDialogComponent, dialogConfig)
            .afterClosed()
            .subscribe((result: AspectToClassDialogResult | undefined) => {
                if (result !== undefined) {
                    this.runConversion(node, result);
                }
            });
    }

    private runConversion(node: DeviceTypeAspectModel, result: AspectToClassDialogResult) {
        const isRoot = this.isRootNode(node);
        const parentRoot = isRoot ? undefined : this.findRoot(node);
        if (!isRoot && parentRoot === undefined) {
            this.snackBar.open('Can\'t find the root of this aspect', 'close', { panelClass: 'snack-bar-error' });
            return;
        }

        this.ready = false;
        this.resolveAspectClass(result.className)
            .pipe(concatMap(aspectClass => this.conversionSteps(node, aspectClass, result.fate, parentRoot)))
            .subscribe({
                next: () => {
                    this.snackBar.open('Aspect converted to aspect class.', undefined, {duration: 2000});
                    this.getAspects();
                },
                error: (err: Error) => {
                    // no rollback exists: every step is a request of its own, so say what got as far
                    // as the repository instead of implying the tree is unchanged
                    this.snackBar.open(
                        'Conversion failed while ' + err.message + '. Earlier steps are already stored.',
                        'close',
                        { panelClass: 'snack-bar-error' },
                    );
                    this.getAspects();
                },
            });
    }

    private conversionSteps(
        node: DeviceTypeAspectModel,
        aspectClass: DeviceTypeAspectClassModel,
        fate: AspectFate,
        parentRoot?: DeviceTypeAspectModel,
    ): Observable<unknown> {
        const steps: Observable<unknown>[] = (node.sub_aspects || []).map(child =>
            this.saveAspectStep({...child, aspect_class_id: aspectClass.id}, 'moving ' + child.name));

        if (fate !== 'delete') {
            const name = fate === 'deprecate' ? deprecatedAspectName(node.name) : node.name;
            steps.push(this.saveAspectStep(
                {...node, name, aspect_class_id: aspectClass.id, sub_aspects: []},
                'keeping ' + node.name,
            ));
        } else if (parentRoot === undefined) {
            steps.push(this.deleteAspectStep(node));
        } else {
            steps.push(this.saveAspectStep(
                this.withoutSubAspect(parentRoot, node.id),
                'removing ' + node.name + ' from ' + parentRoot.name,
            ));
        }
        return concat(...steps).pipe(toArray());
    }

    private resolveAspectClass(name: string): Observable<DeviceTypeAspectClassModel> {
        const existing = this.aspectClasses.find(c => c.name === name);
        if (existing !== undefined) {
            return of(existing);
        }
        return this.aspectClassesService.createAspectClass(name).pipe(
            map(created => {
                if (created === null) {
                    throw new Error('creating the aspect class');
                }
                this.addToAspectClassList(created);
                return created;
            }),
        );
    }

    private saveAspectStep(aspect: DeviceTypeAspectModel, step: string): Observable<unknown> {
        return this.aspectsService.updateAspects(this.aspectWriteRequest(aspect)).pipe(
            map(resp => {
                if (resp === null) {
                    throw new Error(step);
                }
                return resp;
            }),
        );
    }

    private deleteAspectStep(node: DeviceTypeAspectModel): Observable<unknown> {
        return this.aspectsService.deleteAspects(node.id).pipe(
            map(deleted => {
                if (!deleted) {
                    throw new Error('deleting ' + node.name);
                }
                return deleted;
            }),
        );
    }

    private withoutSubAspect(node: DeviceTypeAspectModel, removeId: string): DeviceTypeAspectModel {
        const copy: DeviceTypeAspectModel = { ...node };
        if (node.sub_aspects !== undefined && node.sub_aspects !== null) {
            copy.sub_aspects = node.sub_aspects
                .filter(sub => sub.id !== removeId)
                .map(sub => this.withoutSubAspect(sub, removeId));
        }
        return copy;
    }

    /**
     * A hierarchy carries one aspect class and the root assigns it: the device-repository copies the
     * root's value down to every sub-aspect on write and answers a sub-aspect that carries a
     * different one with 400. Sending the descendants without the field therefore lets the root
     * settle it, and changing the root's class or moving a subtree needs no further bookkeeping.
     */
    private aspectWriteRequest(root: DeviceTypeAspectModel): DeviceTypeAspectModel {
        const request = this.withoutAspectClassId(root);
        if (root.aspect_class_id) {
            request.aspect_class_id = root.aspect_class_id;
        }
        return request;
    }

    private withoutAspectClassId(node: DeviceTypeAspectModel): DeviceTypeAspectModel {
        const copy: DeviceTypeAspectModel = { ...node };
        delete copy.aspect_class_id;
        if (node.sub_aspects !== undefined && node.sub_aspects !== null) {
            copy.sub_aspects = node.sub_aspects.map((sub) => this.withoutAspectClassId(sub));
        }
        return copy;
    }

    private addToAspectClassList(created: DeviceTypeAspectClassModel) {
        this.aspectClasses = [...this.aspectClasses, created].sort((a, b) => a.name.localeCompare(b.name));
    }

    private getAspectClasses(): Observable<DeviceTypeAspectClassModel[]> {
        if (!this.userHasAspectClassReadAuthorization) {
            return of([]);
        }
        return this.aspectClassesService.getAspectClasses(9999, 0).pipe(
            tap((aspectClasses) => this.aspectClasses = aspectClasses),
        );
    }

    private getAspects() {
        this.deviceTypesService
            .getAspects()
            .subscribe((aspects: DeviceTypeAspectModel[]) => {
                this.setTree(aspects);
                this.updateAspectsUsedInDeviceTypes(aspects);
                this.ready = true;
            });
    }

    /**
     * A class may not take a name another one already has: the conversion helper resolves a class by
     * name, and two of the same name make that pick arbitrary.
     */
    aspectClassNameTaken(group: DeviceTypeAspectModel): boolean {
        const name = (group.name || '').trim();
        return this.aspectClasses.some(c => c.id !== group.id && c.name === name);
    }

    aspectClassNameValid(group: DeviceTypeAspectModel): boolean {
        return (group.name || '').trim().length > 0 && !this.aspectClassNameTaken(group);
    }

    /** Starts a new root hierarchy inside the class; it is written when the user saves the row. */
    addAspectToClass(group: DeviceTypeAspectModel) {
        const added = {name: '', aspect_class_id: group.id} as DeviceTypeAspectModel;
        this.setTree([...this.rootAspects(), added]);
        const regrouped = this.dataSource.data.find(node => node.id === group.id);
        if (regrouped !== undefined) {
            this.treeControl.expand(regrouped);
        }
    }

    deleteAspectClass(group: DeviceTypeAspectModel) {
        this.dialogsService
            .openDeleteDialog('aspect class ' + group.name)
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.aspectClassesService.deleteAspectClass(group.id).subscribe((resp) => {
                    if (!resp.deleted) {
                        // the 400 names the aspects still carrying the class, and nothing else can
                        this.snackBar.open(
                            resp.error ? 'Could not delete the aspect class: ' + resp.error
                                : 'Error while deleting the aspect class!',
                            'close',
                            { panelClass: 'snack-bar-error' },
                        );
                        return;
                    }
                    this.aspectClasses = this.aspectClasses.filter(c => c.id !== group.id);
                    this.setTree(this.rootAspects());
                    this.snackBar.open('Aspect class deleted successfully.', undefined, {duration: 2000});
                });
            });
    }

    /** The device-repository refuses the delete while an aspect carries the class. */
    aspectClassInUse(group: DeviceTypeAspectModel): boolean {
        return (group.sub_aspects || []).length > 0;
    }

    saveAspectClass(group: DeviceTypeAspectModel) {
        const name = (group.name || '').trim();
        this.aspectClassesService.updateAspectClass({id: group.id, name}).subscribe((saved) => {
            if (saved === null) {
                this.snackBar.open('Error while saving the aspect class!', 'close', { panelClass: 'snack-bar-error' });
                return;
            }
            this.aspectClasses = this.aspectClasses
                .map(c => c.id === saved.id ? saved : c)
                .sort((a, b) => a.name.localeCompare(b.name));
            // the group rows are labelled from that list and sorted by name, so both follow the rename
            this.setTree(this.rootAspects());
            this.snackBar.open('Aspect class saved successfully.', undefined, {duration: 2000});
        });
    }

    isAspectClassGroup(node: DeviceTypeAspectModel): boolean {
        return (node as AspectClassGroupNode).is_aspect_class_group === true;
    }

    /**
     * The root hierarchies behind the displayed tree. Group rows are not aspects, so everything that
     * writes, deletes or reparents an aspect works from this list rather than from `dataSource.data`.
     */
    private rootAspects(): DeviceTypeAspectModel[] {
        const result: DeviceTypeAspectModel[] = [];
        this.dataSource.data.forEach((node) => {
            if (this.isAspectClassGroup(node)) {
                result.push(...(node.sub_aspects || []));
            } else {
                result.push(node);
            }
        });
        return result;
    }

    private setTree(roots: DeviceTypeAspectModel[]) {
        const knownIds = this.dataSource.data.map(node => node.id);
        const grouped = this.groupByAspectClass(roots);
        this.dataSource.data = grouped;
        // a group row is a heading, not a fold to open first, so a group that was not on screen before
        // comes expanded; one the user collapsed keeps its state, because redraw restores it by id
        const newGroups = grouped.filter(node => this.isAspectClassGroup(node) && !knownIds.includes(node.id));
        this.redraw();
        newGroups.forEach(group => this.treeControl.expand(group));
    }

    /**
     * Hierarchies that share an aspect class are shown under one row for that class, which then takes
     * the place a root aspect would hold. An unclassified hierarchy stays at the top level. A class
     * with a single hierarchy is grouped too, so the shape does not jump once a second one arrives,
     * and a class no aspect carries still gets its row — that row is where it is renamed and deleted.
     */
    private groupByAspectClass(roots: DeviceTypeAspectModel[]): DeviceTypeAspectModel[] {
        const byClass = new Map<string, DeviceTypeAspectModel[]>();
        const unclassified: DeviceTypeAspectModel[] = [];
        roots.forEach((root) => {
            const classId = root.aspect_class_id;
            if (classId) {
                byClass.set(classId, (byClass.get(classId) || []).concat(root));
            } else {
                unclassified.push(root);
            }
        });

        const groups: DeviceTypeAspectModel[] = [];
        const classIds = new Set([...this.aspectClasses.map(c => c.id), ...byClass.keys()]);
        classIds.forEach((classId) => {
            groups.push({
                id: classId,
                name: this.aspectClassName(classId),
                sub_aspects: byClass.get(classId) || [],
                is_aspect_class_group: true,
            } as AspectClassGroupNode);
        });
        groups.sort((a, b) => a.name.localeCompare(b.name));
        return [...groups, ...unclassified];
    }

    private aspectClassName(classId: string): string {
        // falling back to the id keeps an aspect whose class was deleted elsewhere visible
        return this.aspectClasses.find(c => c.id === classId)?.name || classId;
    }

    private redraw() {
        const data = this.dataSource.data;
        // regrouping replaces the group objects, and a root aspect now sits one level down, so the
        // expansion is restored by id across every level instead of only the top one
        const expandedIds = this.treeControl.expansionModel.selected.map(n => n.id);
        this.dataSource.data = [];
        this.dataSource.data = data;
        this.expandByIds(data, expandedIds);
    }

    private expandByIds(nodes: DeviceTypeAspectModel[], ids: (string | undefined)[]) {
        nodes.forEach((node) => {
            if (node.id !== undefined && ids.includes(node.id)) {
                this.treeControl.expand(node);
            }
            this.expandByIds(node.sub_aspects || [], ids);
        });
    }

    private updateAspectsUsedInDeviceTypes(aspects: DeviceTypeAspectModel[]) {
        if (!this.userHasUsedInAuthorization) {
            return;
        }
        const query: UsedInDeviceTypeQuery = {
            resource: 'aspects',
            ids: this.getAspectIds(aspects)
        };
        console.log(query);
        this.deviceTypesService.getUsedInDeviceType(query).subscribe(result => {
            console.log(result);
            result?.forEach((value, key) => {
                this.usedIn.set(key, value);
            });
        });
    }

    public showUsedInDialog(usedIn: UsedInDeviceTypeResponseElement | undefined) {
        if (usedIn) {
            this.deviceTypesService.openUsedInDeviceTypeDialog(usedIn);
        }
    }

    private getAspectIds(aspects: DeviceTypeAspectModel[] | null | undefined) {
        let result: string[] = [];
        aspects?.forEach(value => {
            result.push(value.id);
            result = result.concat(this.getAspectIds(value.sub_aspects));
        });
        return result;
    }
}
