/*
 * Copyright 2024 InfAI (CC SES)
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

import { AfterContentInit, Component, Input, ViewChild } from '@angular/core';
import { PermissionsRightsModel } from '../../../shared/permissions-rights.model';
import { PermissionsUserModel } from '../../../shared/permissions-user.model';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxChange } from '@angular/material/checkbox';

export interface AnnotatedPermissionsV2ResourceModel extends PermissionsRightsModel {
  name: string;
  id: string;
}


export enum PermissionTypes {
  user,
  role,
  group
}


@Component({
  selector: 'senergy-permission-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements AfterContentInit {

  @Input() permissions: { [key: string]: PermissionsRightsModel } = {};
  @Input() type: PermissionTypes = PermissionTypes.user;
  @Input() users: PermissionsUserModel[] = [];
  @Input() userId: string | null = '';
  @Input() icon?: string;
  @Input() isAdmin: boolean = false;
  @Input() descriptions: any;
  @Input() header: boolean = false;

  @ViewChild('table', { static: false }) table?: MatTable<AnnotatedPermissionsV2ResourceModel>;

  displayedColumns: string[] = [];
  flattened = new MatTableDataSource<AnnotatedPermissionsV2ResourceModel>();

  ngAfterContentInit(): void {
    this.displayedColumns = ['name'];
    if (this.icon !== null && this.icon !== undefined) {
      this.displayedColumns.push('icon');
    }
    this.displayedColumns.push('read', 'write', 'execute', 'administrate', 'action');
  }


  flatten() {
    const f: AnnotatedPermissionsV2ResourceModel[] = [];
    Object.keys(this.permissions).forEach(k => {
      f.push({
        administrate: this.permissions[k].administrate,
        read: this.permissions[k].read,
        write: this.permissions[k].write,
        execute: this.permissions[k].execute,
        name: this.lookup(k),
        id: k,
      });
    });
    this.flattened.data = f;
  }

  private lookup(k: string): string {
    if (this.type === PermissionTypes.user) {
      return this.users.find(u => u.id === k)?.username || k;
    }
    return k;
  }

  canEdit(element: AnnotatedPermissionsV2ResourceModel): boolean {
    switch (this.type) {
      case PermissionTypes.user:
        return element.id !== this.userId;
      case PermissionTypes.role:
        return this.isAdmin;
      case PermissionTypes.group:
        return true;
    }
  }

  delete(element: AnnotatedPermissionsV2ResourceModel) {
    if (!this.canEdit(element)) {
      console.error('no permission to delete this element');
      return;
    }
    delete this.permissions[element.id];
    const i = this.flattened.data.findIndex(e => e.id === element.id);
    if (i !== -1) {
      this.flattened.data.splice(i, 1);
    }
    this.table?.renderRows();
    return;
  }

  render() {
    this.flatten();
  }

  setR(element: AnnotatedPermissionsV2ResourceModel, $event: MatCheckboxChange) {
    this.permissions[element.id].read = $event.checked;
    const e = this.flattened.data.find(e => e.id === element.id);
    if (e !== undefined) {
      e.read = $event.checked;
    }
  }

  setW(element: AnnotatedPermissionsV2ResourceModel, $event: MatCheckboxChange) {
    this.permissions[element.id].write = $event.checked;
    const e = this.flattened.data.find(e => e.id === element.id);
    if (e !== undefined) {
      e.write = $event.checked;
    }
  }

  setX(element: AnnotatedPermissionsV2ResourceModel, $event: MatCheckboxChange) {
    this.permissions[element.id].execute = $event.checked;
    const e = this.flattened.data.find(e => e.id === element.id);
    if (e !== undefined) {
      e.execute = $event.checked;
    }
  }

  setA(element: AnnotatedPermissionsV2ResourceModel, $event: MatCheckboxChange) {
    this.permissions[element.id].administrate = $event.checked;
    const e = this.flattened.data.find(e => e.id === element.id);
    if (e !== undefined) {
      e.administrate = $event.checked;
    }
  }
}
