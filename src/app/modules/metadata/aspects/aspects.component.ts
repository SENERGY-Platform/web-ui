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

import {Component, OnInit, ViewChild} from '@angular/core';
import {Observable} from 'rxjs';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import {AspectsService} from './shared/aspects.service';
import {DeviceTypeAspectModel} from '../device-types-overview/shared/device-type.model';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTree, MatTreeNestedDataSource} from '@angular/material/tree';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {DeviceTypeService} from '../device-types-overview/shared/device-type.service';

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
    userIsAdmin = false;

    dragging = false;

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
    ) {
    }

    ngOnInit() {
        this.getAspects();
        this.userIsAdmin = this.authService.userIsAdmin();
    }

    newAspect(): void {
        this.dataSource.data.push({name: ''} as DeviceTypeAspectModel);
        this.redraw();
    }

    addSubNode(node: DeviceTypeAspectModel) {
        node.sub_aspects = node.sub_aspects || [];
        node.sub_aspects.push({name: ''} as DeviceTypeAspectModel);
        this.treeControl.expand(node);
        this.redraw();
    }

    deleteNode(node: DeviceTypeAspectModel, skipDialog = false) {
        this.dataSource.data.forEach((sub, i) => {
            if (sub === node) {
                const del = (deleteAspect: boolean) => {
                    if (deleteAspect) {
                        if (node.id === undefined) {
                            this.dataSource.data.splice(i, 1);
                            this.redraw();
                        } else {
                            this.aspectsService.deleteAspects(node.id).subscribe((resp: boolean) => {
                                if (resp === true) {
                                    this.dataSource.data.splice(i, 1);
                                    this.redraw();
                                    this.snackBar.open('Aspect deleted successfully.', undefined, {duration: 2000});
                                } else {
                                    this.snackBar.open('Error while deleting the aspect!', "close", { panelClass: "snack-bar-error" });
                                }
                            });
                        }
                    }
                };
                if (!skipDialog) {
                    this.dialogsService
                        .openDeleteDialog('aspect ' + node.name + ' and all sub aspects')
                        .afterClosed()
                        .subscribe(del);
                } else {
                    del(true);
                }

            } else {
                this.findAndDeleteChild(sub, node, skipDialog);
            }
        });
        this.redraw();
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
        return this.dataSource.data.find(n => n === node) !== undefined;
    }

    save(node: DeviceTypeAspectModel) {
        let obs: Observable<DeviceTypeAspectModel | null> | undefined;
        if (node.id === undefined) {
            obs = this.aspectsService.createAspect(node);
        } else {
            obs = this.aspectsService.updateAspects(node);
        }

        obs.subscribe((resp: DeviceTypeAspectModel | null) => {
            if (resp === null) {
                this.snackBar.open('Error while saving the aspect!', "close", { panelClass: "snack-bar-error" });
            } else {
                const i = this.dataSource.data.findIndex(x => x === node);
                if (i !== -1) {
                    this.dataSource.data[i] = resp;
                    this.redraw();
                }
                this.snackBar.open('Aspect saved successfully.', undefined, {duration: 2000});
            }
        });
    }

    private findAndDeleteChild(data: DeviceTypeAspectModel, searchElement: DeviceTypeAspectModel, skipDialog = false) {
        if (data.sub_aspects === null || data.sub_aspects === undefined) {
            return;
        }
        const i = data.sub_aspects.indexOf(searchElement);
        if (i === -1) {
            data.sub_aspects.forEach((sub) => this.findAndDeleteChild(sub, searchElement, skipDialog));
        } else {
            if (skipDialog) {
                data.sub_aspects?.splice(i, 1);
                this.redraw();
            } else {
                this.dialogsService
                    .openDeleteDialog('aspect ' + data.sub_aspects[i].name + ' and all sub aspects')
                    .afterClosed()
                    .subscribe((deleteAspect: boolean) => {
                        if (deleteAspect) {
                            data.sub_aspects?.splice(i, 1);
                            this.redraw();
                        }
                    });
            }
        }
    }

    dropped($event: any, target?: DeviceTypeAspectModel) {
        const node = $event.item.data as DeviceTypeAspectModel;
        if (node === target) {
            this.snackBar.open('Can\'t move aspect into itself', "close", { panelClass: "snack-bar-error" });
            return;
        }
        if (target !== undefined && !this.nodeValid(target)) {
            this.snackBar.open('Can\'t move into invalid aspect', "close", { panelClass: "snack-bar-error" });
            return;
        }
        if (target !== undefined && this.hasDescendant(node, target)) {
            this.snackBar.open('Can\'t move into descendant aspect', "close", { panelClass: "snack-bar-error" });
            return;
        }
        this.dialogsService.openConfirmDialog('Move Aspect', 'Do you want to move this aspect? Changes will be saved immediately').afterClosed().subscribe(move => {
            if (!move) {
                return;
            }
            const clone = JSON.parse(JSON.stringify(node));
            if (target !== undefined) {
                if (target.sub_aspects === undefined || target.sub_aspects === null) {
                    target.sub_aspects = [clone];
                } else {
                    target.sub_aspects.push(clone);
                }
            } else {
                this.dataSource.data.push(clone);
            }
            const root = this.findRoot(clone);
            if (root !== undefined) {
                this.save(root);
            } else {
                this.snackBar.open('Can\'t find new root for moved Aspect', "close", { panelClass: "snack-bar-error" });
            }
            this.deleteNode(node, true);
            this.redraw();
        });
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
        return this.dataSource.data.find(root => this.hasDescendant(root, node));
    }

    private getAspects() {
        this.deviceTypesService
            .getAspects()
            .subscribe((aspects: DeviceTypeAspectModel[]) => {
                this.dataSource.data = aspects;
                this.redraw();
                this.ready = true;
            });
    }

    private redraw() {
        const data = this.dataSource.data;
        const expanded = this.treeControl.expansionModel.selected;
        this.dataSource.data = [];
        this.dataSource.data = data;
        data.filter(f => expanded.some(e => e.id === f.id )).forEach(n => this.treeControl.expand(n));
    }
}
