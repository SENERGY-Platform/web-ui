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
import {MatDialog} from '@angular/material/dialog';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import {AspectsPermSearchModel} from './shared/aspects-perm-search.model';
import {AspectsService} from './shared/aspects.service';
import {DeviceTypeAspectModel} from '../device-types-overview/shared/device-type.model';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTree, MatTreeNestedDataSource} from '@angular/material/tree';
import {AuthorizationService} from '../../../core/services/authorization.service';

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

    constructor(
        private dialog: MatDialog,
        private responsiveService: ResponsiveService,
        private aspectsService: AspectsService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
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
        if (node.sub_aspects === undefined) {
            node.sub_aspects = [];
        }
        node.sub_aspects.push({name: ''} as DeviceTypeAspectModel);
        this.treeControl.expand(node);
        this.redraw();
    }

    deleteNode(node: AspectsPermSearchModel | DeviceTypeAspectModel) {
        this.dataSource.data.forEach((sub, i) => {
            if (sub === node) {
                this.dialogsService
                    .openDeleteDialog('aspect ' + node.name + ' and all sub aspects')
                    .afterClosed()
                    .subscribe((deleteAspect: boolean) => {
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
                                        this.snackBar.open('Error while deleting the aspect!', undefined, {duration: 2000});
                                    }
                                });
                            }
                        }
                    });

            } else {
                this.findAndDeleteChild(sub, node);
            }
        });
        this.redraw();
    }

    nodeValid(node: DeviceTypeAspectModel): boolean {
        if (node.name.length === 0) {
            return false;
        }
        if (node.sub_aspects !== undefined) {
            for (const n of node.sub_aspects) {
                if (!this.nodeValid(n)) {
                    return false;
                }
            }
        }
        return true;
    }

    isRootNode(node: DeviceTypeAspectModel): boolean {
        return this.dataSource.data.find(n => n === node) !== undefined;
    }

    save(node: DeviceTypeAspectModel) {
        let obs: Observable<DeviceTypeAspectModel | null>|undefined;
        if (node.id === undefined) {
            obs = this.aspectsService.createAspect(node);
        } else {
            obs = this.aspectsService.updateAspects(node);
        }

        obs.subscribe((resp: DeviceTypeAspectModel | null) => {
            if (resp === null) {
                this.snackBar.open('Error while saving the aspect!', undefined, {duration: 2000});
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

    private findAndDeleteChild(data: DeviceTypeAspectModel, searchElement: DeviceTypeAspectModel) {
        if (data.sub_aspects === null || data.sub_aspects === undefined) {
            return;
        }
        const i = data.sub_aspects.indexOf(searchElement);
        if (i === -1) {
            data.sub_aspects.forEach((sub) => this.findAndDeleteChild(sub, searchElement));
        } else {
            this.dialogsService
                .openDeleteDialog('aspect ' +  data.sub_aspects[i].name + ' and all sub aspects')
                .afterClosed()
                .subscribe((deleteAspect: boolean) => {
                    if (deleteAspect) {
                        data.sub_aspects?.splice(i, 1);
                        this.redraw();
                    }
                });
        }
    }

    private getAspects() {
        this.aspectsService
            .getAspects('', 9999, 0, 'name', 'asc')
            .subscribe((aspects: AspectsPermSearchModel[]) => {
                this.dataSource.data = aspects;
                this.redraw();
                this.ready = true;
            });
    }

    private redraw() {
        const data = this.dataSource.data;
        this.dataSource.data = [];
        this.dataSource.data = data;
    }
}
