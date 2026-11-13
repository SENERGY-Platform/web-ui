/*
 * Copyright 2026 InfAI (CC SES)
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

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, FormsModule, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ErrorStateMatcher, MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatNestedTreeNode, MatTree, MatTreeNestedDataSource, MatTreeNode, MatTreeNodeDef, MatTreeNodeOutlet, MatTreeNodeToggle } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../../core/components/form-section/form-section.component';
import { SaveBarComponent } from '../../../../core/components/save-bar/save-bar.component';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { LIST_DATE_FORMAT } from '../../../../core/classes/list-date-format';
import { dialogSize } from '../../../../core/dialog-size';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { snackSuccess } from '../../../../core/services/snack-bar-messages';
import { PermissionsService } from '../../../permissions/shared/permissions.service';
import { Attribute } from '../../device-instances/shared/device-instances.model';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import {
    DeviceTypeAspectClassModel,
    DeviceTypeAspectModel,
    DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel,
} from '../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceTypeHelperService } from '../../../metadata/device-types-overview/device-types/shared/device-type-helper.service';
import { DeviceTypesContentVariableDialogComponent } from '../../../metadata/device-types-overview/device-types/dialogs/device-types-content-variable-dialog.component';
import { DeviceTypesContentVariableJsonDialogComponent } from '../../../metadata/device-types-overview/device-types/dialogs/device-types-content-variable-json-dialog.component';
import { ConceptsService } from '../../../metadata/concepts/shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../../../metadata/concepts/shared/concepts-characteristics.model';
import { AspectClassesService } from '../../../metadata/aspects/shared/aspect-classes.service';
import { ThingsDeviceLinkDialogComponent } from '../dialogs/things-device-link-dialog.component';
import {
    THING_ATTRIBUTE_KEYS,
    THING_TOPIC,
    ThingAttributeKey,
    ThingDeviceLinkCreateModel,
    ThingDeviceLinkModel,
    ThingModel,
    thingAttributeError,
    thingAttributeKey,
} from '../shared/things.model';
import { ThingsService } from '../shared/things.service';

const LIST_ROUTE = '/devices/things';

/** The content variable without the tree positions the editor adds; the copy keeps every other field. */
function withoutIndices(contentVariable: DeviceTypeContentVariableModel): DeviceTypeContentVariableModel {
    const { indices: _indices, ...rest } = contentVariable;
    return rest.sub_content_variables ? { ...rest, sub_content_variables: rest.sub_content_variables.map(withoutIndices) } : rest;
}

/** Creates, edits and shows one thing; without the write permission the same page is read-only. */
@Component({
    selector: 'senergy-things-edit',
    templateUrl: './things-edit.component.html',
    styleUrls: ['./things-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        DatePipe,
        MatFormField,
        MatLabel,
        MatError,
        MatHint,
        MatSuffix,
        MatAutocomplete,
        MatAutocompleteTrigger,
        MatOption,
        MatInput,
        MatButton,
        MatIconButton,
        MatIcon,
        MatTooltip,
        MatTree,
        MatTreeNodeDef,
        MatTreeNode,
        MatTreeNodeToggle,
        MatNestedTreeNode,
        MatTreeNodeOutlet,
        MatErrorMessagesDirective,
        PageHeaderComponent,
        FormSectionComponent,
        SaveBarComponent,
    ],
})
export class ThingsEditComponent implements OnInit {
    private thingsService = inject(ThingsService);
    private permissionsService = inject(PermissionsService);
    private deviceInstancesService = inject(DeviceInstancesService);
    private deviceTypeService = inject(DeviceTypeService);
    private deviceTypeHelperService = inject(DeviceTypeHelperService);
    private conceptsService = inject(ConceptsService);
    private aspectClassesService = inject(AspectClassesService);
    private dialogsService = inject(DialogsService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    readonly dateFormat = LIST_DATE_FORMAT;
    readonly listLink = LIST_ROUTE;
    readonly attributeKey = thingAttributeKey;
    readonly valueError = thingAttributeError;

    id = '';
    /** The thing as loaded or last saved; fields the form does not know stay in it and are sent back unchanged. */
    thing: ThingModel | undefined;
    editable = false;
    isSaving = false;
    isLinking = false;
    isReloading = false;
    foreignAttributesUnlocked = false;

    /** Name as loaded or last saved; the page title, so it does not follow the name field while typing. */
    savedName = '';
    nameControl = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });
    attributes: Attribute[] = [];
    dataSource = new MatTreeNestedDataSource<DeviceTypeContentVariableModel>();
    tree = new NestedTreeControl<DeviceTypeContentVariableModel>((node) => node.sub_content_variables);
    links: ThingDeviceLinkModel[] = [];
    deviceNames = new Map<string, string>();

    private measuringFunctions: DeviceTypeFunctionModel[] = [];
    private aspects: DeviceTypeAspectModel[] = [];
    private aspectClasses: DeviceTypeAspectClassModel[] = [];
    private concepts: ConceptsCharacteristicsModel[] = [];
    /** Editable state as loaded or last saved, serialized; the save bar shows while the current state differs. */
    private savedState = '';
    private cancelReload$ = new Subject<void>();
    private errorMatcherCache = new WeakMap<Attribute, { key: ErrorStateMatcher; value: ErrorStateMatcher }>();

    hasChild = (_: number, node: DeviceTypeContentVariableModel) => !!node.sub_content_variables;

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
        const lookups$ = forkJoin({
            functions: this.deviceTypeService.getMeasuringFunctions(),
            aspects: this.deviceTypeService.getAspects(),
            // reading aspect classes is a right of its own; without it the dialog just shows no class
            aspectClasses: this.aspectClassesService.userHasReadAuthorization()
                ? this.aspectClassesService.getAspectClasses(9999, 0)
                : of([] as DeviceTypeAspectClassModel[]),
            concepts: this.conceptsService.getConceptsWithCharacteristics({ limit: 9999 }),
        });
        if (this.id === '') {
            lookups$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lookups) => {
                this.setLookups(lookups);
                this.editable = this.thingsService.userHasCreateAuthorization();
                this.applyThing({ id: '', name: '', attributes: [], content_variables: [], owner_id: '', device_links: [] });
                this.afterEditableKnown();
            });
            return;
        }
        forkJoin({ lookups: lookups$, thing: this.thingsService.getThing(this.id), editable: this.loadEditable(this.id) })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ lookups, thing, editable }) => {
                if (!thing) {
                    return; // the service reported the error
                }
                this.setLookups(lookups);
                this.editable = editable;
                this.applyThing(thing);
                this.afterEditableKnown();
            });
    }

    /** A stored thing is editable with the update right and the write permission on it; unknown permissions mean read-only. */
    private loadEditable(id: string) {
        const update = this.thingsService.userHasUpdateAuthorization();
        const permissions$ = update ? this.permissionsService.getComputedResourcePermissionsV2(THING_TOPIC, [id]) : of([]);
        return permissions$.pipe(
            catchError(() => of([])),
            map((permissions) => update && permissions.find((p) => p.id === id)?.write === true),
        );
    }

    private setLookups(lookups: {
        functions: DeviceTypeFunctionModel[];
        aspects: DeviceTypeAspectModel[];
        aspectClasses: DeviceTypeAspectClassModel[];
        concepts: { result: ConceptsCharacteristicsModel[] };
    }) {
        this.measuringFunctions = lookups.functions;
        this.aspects = lookups.aspects;
        this.aspectClasses = lookups.aspectClasses;
        this.concepts = lookups.concepts.result;
    }

    private afterEditableKnown() {
        if (this.editable) {
            this.nameControl.enable({ emitEvent: false });
        } else {
            this.nameControl.disable({ emitEvent: false });
        }
    }

    /** Takes the thing as the loaded state and puts the form, the attributes and the tree to it. */
    private applyThing(thing: ThingModel) {
        this.thing = { ...thing, device_links: thing.device_links ?? [] };
        this.savedName = thing.name ?? '';
        this.nameControl.setValue(this.savedName, { emitEvent: false });
        this.attributes = (thing.attributes || []).map((a) => ({ ...a }));
        this.showTree(JSON.parse(JSON.stringify(thing.content_variables || [])));
        this.savedState = this.currentState();
        this.setLinks(this.thing.device_links);
    }

    // ---- state -----------------------------------------------------------------------------------

    /** True while the editable fields differ from the loaded or last saved state; always true for a new thing. */
    hasChanges(): boolean {
        return !!this.thing && (this.id === '' || this.currentState() !== this.savedState);
    }

    /** A save and a link change exclude each other: the later answer would show the links of the earlier state. */
    saveDisabled(): boolean {
        return this.isSaving || this.isReloading || this.isLinking || this.nameControl.invalid || this.hasInvalidAttributes();
    }

    saveStatus(): string {
        if (this.isSaving) {
            return 'Saving...';
        }
        if (this.nameControl.invalid) {
            return 'Name is required to save.';
        }
        if (this.hasInvalidAttributes()) {
            return 'Fix the invalid attribute values to save.';
        }
        return this.id === '' ? '' : 'Unsaved changes';
    }

    private currentState(): string {
        return this.stateOf(this.nameControl.getRawValue(), this.attributes, this.dataSource.data);
    }

    private stateOf(name: string, attributes: Attribute[], contentVariables: DeviceTypeContentVariableModel[]): string {
        return JSON.stringify([name ?? '', (attributes || []).map((a) => [a.key, a.value, a.origin]), contentVariables.map(withoutIndices)]);
    }

    // ---- save and discard --------------------------------------------------------------------------

    save(): void {
        if (!this.thing || !this.editable || this.saveDisabled()) {
            return;
        }
        // every field the form does not know stays in the loaded thing and goes back unchanged; one writer per
        // harmonized key (SNRGY-5133): an entry written here names this page, the form keeps it until the answer
        const toSave: ThingModel = {
            ...this.thing,
            name: this.nameControl.getRawValue(),
            attributes: this.attributes.map((a) => (this.changedAttribute(a) ? { ...a, origin: 'web-ui' } : { ...a })),
            content_variables: this.dataSource.data.map(withoutIndices),
        };
        const sentState = this.currentState();
        this.isSaving = true;
        if (this.id === '') {
            this.thingsService
                .createThing(toSave)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((created) => {
                    this.isSaving = false;
                    if (created) {
                        snackSuccess(this.snackBar, 'Thing saved successfully.');
                        this.router.navigate(['devices/things/edit', created.id]);
                    }
                });
            return;
        }
        this.thingsService
            .updateThing(toSave)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((saved) => {
                this.isSaving = false;
                if (!saved) {
                    return; // the service reported the error, the edits stay
                }
                snackSuccess(this.snackBar, 'Thing saved successfully.');
                const answer: ThingModel = { ...saved, device_links: saved.device_links ?? this.thing?.device_links ?? [] };
                if (this.currentState() === sentState) {
                    this.applyThing(answer);
                } else {
                    // edited while the request ran: those edits stay, the answer becomes the base they are compared to
                    this.thing = answer;
                    this.savedName = answer.name ?? '';
                    this.savedState = this.stateOf(
                        answer.name,
                        (answer.attributes || []).map((a) => ({ ...a })),
                        this.withPositions(JSON.parse(JSON.stringify(answer.content_variables || []))),
                    );
                    this.setLinks(answer.device_links);
                }
            });
    }

    /** Restores the loaded state; a new thing has none, so it returns to the list. */
    discard(): void {
        if (this.isSaving) {
            return;
        }
        if (this.id === '') {
            this.router.navigate([LIST_ROUTE]);
            return;
        }
        // a reload still in flight is cancelled; the form is reset only once the new one arrived
        this.cancelReload$.next();
        this.isReloading = true;
        this.thingsService
            .getThing(this.id)
            .pipe(takeUntil(this.cancelReload$), takeUntilDestroyed(this.destroyRef))
            .subscribe((thing) => {
                this.isReloading = false;
                if (thing) {
                    this.applyThing(thing);
                }
            });
    }

    // ---- attributes ------------------------------------------------------------------------------

    addAttr(): void {
        this.attributes.push({ key: '', value: '', origin: 'web-ui' });
    }

    removeAttr(i: number): void {
        this.attributes.splice(i, 1);
    }

    ownAttribute(attr: Attribute): boolean {
        return !attr.origin || attr.origin === 'web-ui';
    }

    /** Attributes of other origins are managed elsewhere and only editable once unlocked. */
    editableAttribute(attr: Attribute): boolean {
        return this.editable && (this.ownAttribute(attr) || this.foreignAttributesUnlocked);
    }

    hasForeignAttributes(): boolean {
        return this.attributes.some((a) => !this.ownAttribute(a));
    }

    foreignAttributesLockLabel(): string {
        return (this.foreignAttributesUnlocked ? 'Lock' : 'Unlock') + ' attributes of other origins';
    }

    /** Harmonized keys whose key or label contains what the key field holds. */
    keyOptions(attr: Attribute): ThingAttributeKey[] {
        const term = (attr.key || '').toLowerCase();
        return THING_ATTRIBUTE_KEYS.filter((k) => k.key.toLowerCase().includes(term) || k.label.toLowerCase().includes(term));
    }

    /** A harmonized key appears once per thing: true when another attribute already has it. */
    keyTaken(key: string, attr: Attribute): boolean {
        return !!thingAttributeKey(key) && this.attributes.some((a) => a !== attr && a.key === key);
    }

    /** A harmonized value is stored with a dot, whichever decimal separator was typed; the field shows what is stored. */
    setValue(attr: Attribute, value: string, field?: NgModel): void {
        const stored = thingAttributeKey(attr.key) ? value.replace(/,/g, '.') : value;
        attr.value = stored;
        if (stored !== value) {
            // the binding writes nothing back when the stored value stays the same, as for a dot replaced by a comma
            field?.control.setValue(stored, { emitViewToModelChange: false });
        }
    }

    /** The fields show their error at once, also for a value stored by another writer, not only after a touch. */
    errorMatchers(attr: Attribute): { key: ErrorStateMatcher; value: ErrorStateMatcher } {
        let matchers = this.errorMatcherCache.get(attr);
        if (!matchers) {
            matchers = {
                key: { isErrorState: () => this.keyTaken(attr.key, attr) },
                value: { isErrorState: () => thingAttributeError(attr) !== null },
            };
            this.errorMatcherCache.set(attr, matchers);
        }
        return matchers;
    }

    /** New, or its key or value differs from every entry of the loaded or last saved thing. */
    private changedAttribute(attr: Attribute): boolean {
        return !(this.thing?.attributes || []).some((s) => s.key === attr.key && s.value === attr.value && s.origin === attr.origin);
    }

    /** Only entries written here block saving; an invalid one stored by another writer just shows its error. */
    private hasInvalidAttributes(): boolean {
        return this.attributes.some((a) => this.changedAttribute(a) && (thingAttributeError(a) !== null || this.keyTaken(a.key, a)));
    }

    // ---- content variables -----------------------------------------------------------------------

    /** Sets the position of every root to its place in the list, the positions below it follow. */
    private withPositions(roots: DeviceTypeContentVariableModel[]): DeviceTypeContentVariableModel[] {
        roots.forEach((root, i) => this.deviceTypeHelperService.setIndices(root, [i]));
        return roots;
    }

    private showTree(roots: DeviceTypeContentVariableModel[]) {
        this.tree.expansionModel.clear();
        this.dataSource.data = this.withPositions(roots);
        this.tree.dataNodes = this.dataSource.data;
    }

    /** The content variables below the node at `indices`; no indices are the roots. */
    private childrenOf(indices: number[]): DeviceTypeContentVariableModel[] {
        let list = this.dataSource.data;
        for (const i of indices) {
            list = list[i]?.sub_content_variables ?? [];
        }
        return list;
    }

    addContentVariable(indices: number[]): void {
        if (!this.editable) {
            return;
        }
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            contentVariable: {} as DeviceTypeContentVariableModel,
            functions: this.measuringFunctions,
            disabled: false,
            concepts: this.concepts,
            aspects: this.aspects,
            aspectClasses: this.aspectClasses,
            allowVoid: false,
            prohibitedNames: this.childrenOf(indices).map((s) => s.name),
        };
        this.dialog
            .open(DeviceTypesContentVariableDialogComponent, dialogConfig)
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((resp: DeviceTypeContentVariableModel | undefined) => {
                if (resp) {
                    this.refreshTree(this.deviceTypeHelperService.addTreeData(this.dataSource.data, resp, indices));
                }
            });
    }

    addContentVariableFromJson(indices: number[]): void {
        if (!this.editable) {
            return;
        }
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            contentVariable: {} as DeviceTypeContentVariableModel,
            prohibitedNames: this.childrenOf(indices).map((s) => s.name),
            name: '',
        };
        this.dialog
            .open(DeviceTypesContentVariableJsonDialogComponent, dialogConfig)
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((resp: DeviceTypeContentVariableModel | undefined) => {
                if (resp) {
                    this.refreshTree(this.deviceTypeHelperService.addTreeData(this.dataSource.data, resp, indices));
                }
            });
    }

    deleteContentVariable(indices: number[]): void {
        if (!this.editable) {
            return;
        }
        this.refreshTree(this.deviceTypeHelperService.deleteTreeData(this.dataSource.data, indices), (old) =>
            this.deviceTypeHelperService.indicesAfterDelete(old, indices),
        );
    }

    editContent(node: DeviceTypeContentVariableModel): void {
        const editable = this.editable;
        const own = node.indices || [];
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            contentVariable: node,
            functions: this.measuringFunctions,
            disabled: !editable,
            concepts: this.concepts,
            aspects: this.aspects,
            aspectClasses: this.aspectClasses,
            allowVoid: false,
            // the siblings; for a root these are the other roots
            prohibitedNames: this.childrenOf(own.slice(0, -1))
                .filter((_, i) => i !== own[own.length - 1])
                .map((s) => s.name),
        };
        this.dialog
            .open(DeviceTypesContentVariableDialogComponent, dialogConfig)
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((resp: DeviceTypeContentVariableModel | undefined) => {
                if (editable && resp && resp.indices) {
                    // the dialog answers the fields it knows; the rest of the node stays
                    this.refreshTree(this.deviceTypeHelperService.updateTreeData(this.dataSource.data, { ...node, ...resp }, resp.indices));
                }
            });
    }

    /**
     * Shows the changed copy of the tree. The tree control knows expanded nodes by object, and the copy has
     * new ones, so the state moves over by position: `newIndices` says where an old node sits in the copy.
     * Nodes without an old counterpart are new and open, together with the nodes above them.
     */
    private refreshTree(
        roots: DeviceTypeContentVariableModel[],
        newIndices: (old: number[]) => number[] | undefined = (old) => old,
    ): void {
        const key = (indices: number[]) => indices.join('.');
        const known = new Set<string>();
        const expanded = new Set<string>();
        const collect = (node: DeviceTypeContentVariableModel) => {
            const indices = node.indices && newIndices(node.indices);
            if (indices) {
                known.add(key(indices));
                if (this.tree.isExpanded(node)) {
                    expanded.add(key(indices));
                }
            }
            node.sub_content_variables?.forEach(collect);
        };
        this.dataSource.data.forEach(collect);

        this.showTree(roots);
        const restore = (node: DeviceTypeContentVariableModel, ancestors: DeviceTypeContentVariableModel[]) => {
            const k = key(node.indices || []);
            if (!known.has(k)) {
                this.tree.expand(node);
                ancestors.forEach((a) => this.tree.expand(a));
            } else if (expanded.has(k)) {
                this.tree.expand(node);
            }
            node.sub_content_variables?.forEach((sub) => restore(sub, [...ancestors, node]));
        };
        this.dataSource.data.forEach((root) => restore(root, []));
    }

    // ---- device links ----------------------------------------------------------------------------

    /** Linking and ending are offered for a stored thing the user may change, with the right to touch links. */
    get canLink(): boolean {
        return this.id !== '' && this.editable && this.thingsService.userHasDeviceLinkAuthorization();
    }

    deviceName(deviceId: string): string {
        return this.deviceNames.get(deviceId) ?? deviceId;
    }

    private setLinks(links: ThingDeviceLinkModel[]) {
        this.links = [...links].sort((a, b) => Date.parse(b.from) - Date.parse(a.from));
        const missing = [...new Set(links.map((l) => l.device_id))].filter((id) => !this.deviceNames.has(id));
        if (missing.length === 0) {
            return;
        }
        this.deviceInstancesService
            .getDeviceListByIds(missing)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((devices) => {
                devices.forEach((d) => this.deviceNames.set(d.id, d.display_name || d.name || d.id));
            });
    }

    /** Only the links of the answer are taken over; the form and its unsaved edits are not touched. */
    private takeLinks(thing: ThingModel | null) {
        this.isLinking = false;
        if (thing && this.thing) {
            this.thing = { ...this.thing, device_links: thing.device_links ?? [] };
            this.setLinks(this.thing.device_links);
        }
    }

    linkDevice(): void {
        if (!this.canLink || this.isLinking || this.isSaving) {
            return;
        }
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('m'));
        dialogConfig.autoFocus = true;
        this.dialog
            .open(ThingsDeviceLinkDialogComponent, dialogConfig)
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((link: ThingDeviceLinkCreateModel | undefined) => {
                if (!link) {
                    return;
                }
                this.isLinking = true;
                this.thingsService
                    .addDeviceLink(this.id, link)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe((thing) => this.takeLinks(thing));
            });
    }

    endLink(link: ThingDeviceLinkModel): void {
        if (!this.canLink || this.isLinking || this.isSaving) {
            return;
        }
        this.dialogsService
            .openConfirmDialog('End link', 'End the link of device ' + this.deviceName(link.device_id) + ' now? A link cannot be reopened.')
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.isLinking = true;
                this.thingsService
                    .endDeviceLink(this.id, link.id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe((thing) => this.takeLinks(thing));
            });
    }
}
