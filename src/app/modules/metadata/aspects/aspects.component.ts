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

import { afterNextRender, Component, ElementRef, Injector, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { concat, Observable, of } from 'rxjs';
import { concatMap, finalize, map, tap, toArray } from 'rxjs/operators';
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
import { MatTree, MatTreeNestedDataSource, MatTreeNodeDef, MatTreeNode, MatNestedTreeNode, MatTreeNodeOutlet } from '@angular/material/tree';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from '../device-types-overview/shared/used-in-device-type.model';
import { CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MtxSelect } from '@ng-matero/extensions/select';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { dialogSize } from '../../../core/dialog-size';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { SaveBarComponent } from '../../../core/components/save-bar/save-bar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { TreeDetailLayoutComponent } from '../../../core/components/tree-detail-layout/tree-detail-layout.component';

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
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CdkDropListGroup, MatTree, MatTreeNodeDef, MatTreeNode, CdkDropList, CdkDrag, MatButton, MatIconButton, CdkDragHandle, MatIcon, MatTooltip, MatFormField, MatLabel, MtxSelect, FormsModule, NgTemplateOutlet, MatInput, MatError, MatErrorMessagesDirective, MatNestedTreeNode, MatHint, MatTreeNodeOutlet, MatMenu, MatMenuItem, MatMenuTrigger, PageHeaderComponent, FormSectionComponent, SaveBarComponent, EmptyStateComponent, TreeDetailLayoutComponent]
})
export class AspectsComponent implements OnInit {
    private dialog = inject(MatDialog);
    private responsiveService = inject(ResponsiveService);
    private aspectsService = inject(AspectsService);
    private searchbarService = inject(SearchbarService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private dialogsService = inject(DialogsService);
    private authService = inject(AuthorizationService);
    private deviceTypesService = inject(DeviceTypeService);
    private aspectClassesService = inject(AspectClassesService);
    private injector = inject(Injector);

    ready = false;

    treeControl = new NestedTreeControl<DeviceTypeAspectModel>((node) => node.sub_aspects);
    dataSource = new MatTreeNestedDataSource<DeviceTypeAspectModel>();

    @ViewChild(MatTree, {static: false}) tree!: MatTree<DeviceTypeAspectModel>;
    @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;
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

    /** The node whose form is open on the right: an aspect, or the row of an aspect class. */
    selected: DeviceTypeAspectModel | undefined;

    /** Root hierarchies and classes with edits the save bar still has to write. */
    dirtyRoots: DeviceTypeAspectModel[] = [];
    dirtyClasses: DeviceTypeAspectModel[] = [];
    saveStatus = '';
    saveBlocked = false;
    saving = false;
    /** True while the tree is being fetched again; edits made meanwhile would be replaced by the answer. */
    reloading = false;
    /** Stored form of each root hierarchy as loaded or last saved, to tell edited from untouched. */
    private baselines = new Map<string, string>();
    /** Class names typed but not saved; a rebuilt tree labels its group rows with them again. */
    private classRenames = new Map<string, string>();

    /** Nothing may be edited or rebuilt while requests of a save or a reload are still out. */
    get locked(): boolean {
        return this.saving || this.reloading;
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
                    snackError(this.snackBar, 'Error while creating the aspect class!');
                    // ng-select swallows a rejected promise, so the message above is the only report
                    reject();
                    return;
                }
                this.addToAspectClassList(created);
                snackSuccess(this.snackBar, 'Aspect class created successfully.');
                resolve(created);
            });
        });
    }

    newAspect(): void {
        if (this.locked) {
            return;
        }
        const added = {name: ''} as DeviceTypeAspectModel;
        this.setTree([...this.rootAspects(), added]);
        this.select(added, true);
    }

    addSubNode(node: DeviceTypeAspectModel) {
        if (this.locked) {
            return;
        }
        const added = {name: ''} as DeviceTypeAspectModel;
        node.sub_aspects = node.sub_aspects || [];
        node.sub_aspects.push(added);
        this.treeControl.expand(node);
        this.redraw();
        this.refreshDirty();
        this.select(added, true);
    }

    select(node: DeviceTypeAspectModel, focusName = false) {
        this.selected = node;
        if (focusName) {
            afterNextRender(() => this.nameInput?.nativeElement.focus(), {injector: this.injector});
        }
    }

    toggle(node: DeviceTypeAspectModel, event: Event) {
        event.stopPropagation();
        this.treeControl.toggle(node);
    }

    /** Called for every edit the form makes, so the save bar follows what was typed. */
    renameNode(node: DeviceTypeAspectModel, name: string) {
        if (this.locked) {
            return;
        }
        node.name = name;
        this.refreshDirty();
    }

    setAspectClass(node: DeviceTypeAspectModel, classId: string | null) {
        if (this.locked) {
            return;
        }
        node.aspect_class_id = classId;
        this.refreshDirty();
    }

    renameAspectClass(group: DeviceTypeAspectModel, name: string) {
        if (this.locked) {
            return;
        }
        group.name = name;
        this.classRenames.set(group.id, name);
        this.refreshDirty();
    }

    hasUnsaved(): boolean {
        return this.dirtyRoots.length > 0 || this.dirtyClasses.length > 0;
    }

    isDirty(node: DeviceTypeAspectModel): boolean {
        return this.isAspectClassGroup(node) ? this.dirtyClasses.some(g => g.id === node.id) : this.dirtyRoots.includes(node);
    }

    /** A move or a conversion reloads the tree, which would drop the edits the bar still holds. */
    dragDisabled(node: DeviceTypeAspectModel): boolean {
        return !this.userIsAdmin || !this.nodeValid(node) || this.hasUnsaved() || this.locked;
    }

    dragHint(node: DeviceTypeAspectModel): string {
        if (this.hasUnsaved()) {
            return 'Save or discard your changes before moving an aspect';
        }
        return this.nodeValid(node) ? 'Drag to move' : 'Name every aspect before moving it';
    }

    rowHasMenu(node: DeviceTypeAspectModel): boolean {
        return this.isAspectClassGroup(node) ? (this.userIsAdmin || this.userHasAspectClassDeleteAuthorization) : this.userIsAdmin;
    }

    /** Which root hierarchies and classes differ from what is stored, and what may block saving them. */
    private refreshDirty() {
        this.dirtyRoots = this.rootAspects().filter(root => root.id === undefined
            || this.baselines.get(root.id) !== this.dirtyKey(root));
        this.dirtyClasses = this.dataSource.data.filter(node => this.isAspectClassGroup(node) && this.aspectClassRenamed(node));
        if (this.dirtyRoots.some(root => !this.nodeValid(root))) {
            this.saveStatus = 'Every aspect needs a name.';
            this.saveBlocked = true;
        } else if (this.dirtyClasses.some(group => !this.aspectClassNameValid(group))) {
            this.saveStatus = 'An aspect class needs a name that no other class has.';
            this.saveBlocked = true;
        } else {
            const parts: string[] = [];
            if (this.dirtyRoots.length > 0) {
                parts.push(this.dirtyRoots.length + (this.dirtyRoots.length === 1 ? ' aspect hierarchy' : ' aspect hierarchies'));
            }
            if (this.dirtyClasses.length > 0) {
                parts.push(this.dirtyClasses.length + (this.dirtyClasses.length === 1 ? ' aspect class' : ' aspect classes'));
            }
            this.saveStatus = 'Unsaved changes in ' + parts.join(' and ');
            this.saveBlocked = false;
        }
    }

    /** Only a name the user typed counts, so a stored name with stray blanks is not dirty after loading. */
    private aspectClassRenamed(group: DeviceTypeAspectModel): boolean {
        const typed = this.classRenames.get(group.id);
        const stored = this.aspectClasses.find(c => c.id === group.id);
        return this.userHasAspectClassUpdateAuthorization && typed !== undefined && stored !== undefined
            && typed !== stored.name && typed.trim() !== stored.name;
    }

    /** What Save would send, with a missing or null `sub_aspects` read as empty so add-then-delete is clean. */
    private dirtyKey(root: DeviceTypeAspectModel): string {
        const normalised = (node: DeviceTypeAspectModel): DeviceTypeAspectModel => {
            const copy = {...node};
            delete copy.sub_aspects;
            return {...copy, sub_aspects: (node.sub_aspects || []).map(normalised)};
        };
        return JSON.stringify(normalised(this.aspectWriteRequest(root)));
    }

    private nodeInTree(nodes: DeviceTypeAspectModel[], wanted: DeviceTypeAspectModel): boolean {
        return nodes.some(node => node === wanted || this.nodeInTree(node.sub_aspects || [], wanted));
    }

    private findById(nodes: DeviceTypeAspectModel[], id: string): DeviceTypeAspectModel | undefined {
        for (const node of nodes) {
            const found = node.id === id ? node : this.findById(node.sub_aspects || [], id);
            if (found !== undefined) {
                return found;
            }
        }
        return undefined;
    }

    /** The rebuilt tree holds new group objects, so the open form is found again by id. */
    private reselect() {
        const wanted = this.selected;
        if (wanted === undefined || this.nodeInTree(this.dataSource.data, wanted)) {
            return;
        }
        this.selected = wanted.id === undefined ? undefined : this.findById(this.dataSource.data, wanted.id);
    }

    /** Writes every edited root hierarchy and renamed class, one request each; a failed one stays dirty. */
    saveAll() {
        if (this.locked || this.saveBlocked || !this.hasUnsaved()) {
            return;
        }
        this.saving = true;
        concat(
            ...this.dirtyRoots.map(root => this.saveRoot(root)),
            ...this.dirtyClasses.map(group => this.saveClass(group)),
        ).pipe(toArray(), finalize(() => this.saving = false)).subscribe();
    }

    /** Reloads from the repository and forgets every edit. */
    discard() {
        if (this.locked) {
            return;
        }
        this.classRenames.clear();
        this.getAspects();
    }

    /**
     * A root hierarchy goes through DELETE; a sub-aspect only leaves the local tree, and the user
     * saves its root afterwards. Which of the two a node is now depends on the real roots, not on the
     * top level of the displayed tree — a classified hierarchy sits under its group row.
     */
    deleteNode(node: DeviceTypeAspectModel, skipDialog = false) {
        if (this.locked) {
            return;
        }
        const del = (confirmed: boolean | undefined) => {
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
                    snackSuccess(this.snackBar, 'Aspect deleted successfully.');
                } else {
                    snackError(this.snackBar, 'Error while deleting the aspect!');
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
        this.saveRoot(node).subscribe();
    }

    private saveRoot(node: DeviceTypeAspectModel): Observable<boolean> {
        const request = this.aspectWriteRequest(node);
        const obs = node.id === undefined
            ? this.aspectsService.createAspect(request)
            : this.aspectsService.updateAspects(request);

        return obs.pipe(map((resp: DeviceTypeAspectModel | null) => {
            if (resp === null) {
                snackError(this.snackBar, 'Error while saving the aspect!');
                return false;
            }
            // an unsaved node has no id to be found by, so the form moves to the root it was saved with
            if (this.selected !== undefined && this.selected.id === undefined
                && (this.selected === node || this.hasDescendant(node, this.selected))) {
                this.selected = resp;
            }
            this.baselines.set(resp.id, this.dirtyKey(resp));
            // regrouping rather than replacing in place: a class the user just changed puts the
            // hierarchy under a different group row
            this.setTree(this.rootAspects().map(root => root === node ? resp : root));
            snackSuccess(this.snackBar, 'Aspect saved successfully.');
            return true;
        }));
    }

    dropped($event: any, target?: DeviceTypeAspectModel) {
        const node = $event.item.data as DeviceTypeAspectModel;
        if (this.locked) {
            return;
        }
        if (this.hasUnsaved()) {
            snackError(this.snackBar, 'Save or discard your changes before moving an aspect.');
            return;
        }
        if (node === target) {
            snackError(this.snackBar, 'Can\'t move aspect into itself');
            return;
        }
        if (target !== undefined && !this.isAspectClassGroup(target) && !this.nodeValid(target)) {
            snackError(this.snackBar, 'Can\'t move into invalid aspect');
            return;
        }
        if (target !== undefined && this.hasDescendant(node, target)) {
            snackError(this.snackBar, 'Can\'t move into descendant aspect');
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
                snackError(this.snackBar, 'Can\'t find the root of the target aspect');
                return;
            }
            const withNode = this.withSubAspect(targetRoot, target, clone);
            request = withNode;
        }

        this.ready = false;
        this.aspectsService.updateAspects(this.aspectWriteRequest(request)).subscribe((resp) => {
            if (resp === null) {
                snackError(this.snackBar, 'Error while moving the aspect!');
            } else {
                snackSuccess(this.snackBar, 'Aspect moved successfully.');
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
        if (this.locked) {
            return;
        }
        if (this.hasUnsaved()) {
            snackError(this.snackBar, 'Save or discard your changes before converting an aspect.');
            return;
        }
        if (!this.nodeValid(node)) {
            snackError(this.snackBar, 'Name every aspect before converting it.');
            return;
        }
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('m'));
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
            snackError(this.snackBar, 'Can\'t find the root of this aspect');
            return;
        }

        this.ready = false;
        this.resolveAspectClass(result.className)
            .pipe(concatMap(aspectClass => this.conversionSteps(node, aspectClass, result.fate, parentRoot)))
            .subscribe({
                next: () => {
                    snackSuccess(this.snackBar, 'Aspect converted to aspect class.');
                    this.getAspects();
                },
                error: (err: Error) => {
                    // no rollback exists: every step is a request of its own, so say what got as far
                    // as the repository instead of implying the tree is unchanged
                    snackError(this.snackBar, 'Conversion failed while ' + err.message + '. Earlier steps are already stored.');
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
        this.reloading = true;
        this.deviceTypesService
            .getAspects()
            .pipe(finalize(() => this.reloading = false))
            .subscribe((aspects: DeviceTypeAspectModel[]) => {
                this.baselines = new Map(aspects.map(root => [root.id, this.dirtyKey(root)]));
                this.setTree(aspects);
                this.updateAspectsUsedInDeviceTypes(aspects);
                this.ready = true;
            });
    }

    /**
     * A class may not take a name another one holds, stored or typed and not yet saved: the conversion helper resolves a class by
     * name, and two of the same name make that pick arbitrary.
     */
    aspectClassNameTaken(group: DeviceTypeAspectModel): boolean {
        const name = (group.name || '').trim();
        return this.aspectClasses.some(c => c.id !== group.id
            && (this.classRenames.get(c.id) ?? c.name).trim() === name);
    }

    aspectClassNameValid(group: DeviceTypeAspectModel): boolean {
        return (group.name || '').trim().length > 0 && !this.aspectClassNameTaken(group);
    }

    /** Starts a new root hierarchy inside the class; it is written when the user saves. */
    addAspectToClass(group: DeviceTypeAspectModel) {
        if (this.locked) {
            return;
        }
        const added = {name: '', aspect_class_id: group.id} as DeviceTypeAspectModel;
        this.setTree([...this.rootAspects(), added]);
        const regrouped = this.dataSource.data.find(node => node.id === group.id);
        if (regrouped !== undefined) {
            this.treeControl.expand(regrouped);
        }
        this.select(added, true);
    }

    deleteAspectClass(group: DeviceTypeAspectModel) {
        if (this.locked) {
            return;
        }
        this.dialogsService
            .openDeleteDialog('aspect class ' + group.name)
            .afterClosed()
            .subscribe((confirmed: boolean | undefined) => {
                if (!confirmed) {
                    return;
                }
                this.aspectClassesService.deleteAspectClass(group.id).subscribe((resp) => {
                    if (!resp.deleted) {
                        // the 400 names the aspects still carrying the class, and nothing else can
                        snackError(this.snackBar, resp.error ? 'Could not delete the aspect class: ' + resp.error
                                : 'Error while deleting the aspect class!');
                        return;
                    }
                    this.aspectClasses = this.aspectClasses.filter(c => c.id !== group.id);
                    this.classRenames.delete(group.id);
                    this.setTree(this.rootAspects());
                    snackSuccess(this.snackBar, 'Aspect class deleted successfully.');
                });
            });
    }

    /** The device-repository refuses the delete while an aspect carries the class. */
    aspectClassInUse(group: DeviceTypeAspectModel): boolean {
        return (group.sub_aspects || []).length > 0;
    }

    saveAspectClass(group: DeviceTypeAspectModel) {
        this.saveClass(group).subscribe();
    }

    private saveClass(group: DeviceTypeAspectModel): Observable<boolean> {
        const name = (group.name || '').trim();
        return this.aspectClassesService.updateAspectClass({id: group.id, name}).pipe(map((saved) => {
            if (saved === null) {
                snackError(this.snackBar, 'Error while saving the aspect class!');
                return false;
            }
            this.aspectClasses = this.aspectClasses
                .map(c => c.id === saved.id ? saved : c)
                .sort((a, b) => a.name.localeCompare(b.name));
            this.classRenames.delete(saved.id);
            // the group rows are labelled from that list and sorted by name, so both follow the rename
            this.setTree(this.rootAspects());
            snackSuccess(this.snackBar, 'Aspect class saved successfully.');
            return true;
        }));
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
        this.reselect();
        this.refreshDirty();
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
                name: this.classRenames.get(classId) ?? this.aspectClassName(classId),
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
