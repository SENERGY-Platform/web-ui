/*
 *
 *     Copyright 2018 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { KongService } from '../services/kong.service';
import { LadonService } from '../services/ladom.service';
import { PermissionModel } from '../permission.model';

@Component({
    selector: 'senergy-permissions-edit',
    templateUrl: './permissions-edit.component.html',
    styleUrls: ['./permissions-edit.component.css'],
})
export class PermissionsEditComponent implements OnInit {
    public isEditMode = false;
    public endpointControl = new FormControl();
    public userIsAdmin = false;
    public title: string;
    // all roles and uris and users
    public roles: any[];
    public uris: string[] = [];
    public users: any[];
    public clients: any[];
    // options for autocomplete filter
    public filteredOptions: Observable<string[]> = new Observable();
    public permission: PermissionModel;

    public form = this.fb.group({
        role: this.route.snapshot.paramMap.get('subject'),
        user: this.route.snapshot.paramMap.get('subject'),
        actions: this.fb.array([]),
    });
    public methods = new FormGroup({
        get: new FormControl(),
        post: new FormControl(),
        patch: new FormControl(),
        delete: new FormControl(),
        put: new FormControl(),
        head: new FormControl(),
    });

    constructor(
        @Inject(MAT_DIALOG_DATA) data: { permission: PermissionModel; roles: any[]; users: any[]; clients: any[] },
        public dialogRef: MatDialogRef<PermissionsEditComponent>,
        private kongService: KongService,
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private ladonService: LadonService,
        private authService: AuthorizationService,
        private snackBar: MatSnackBar,
    ) {
        this.permission = data.permission;
        this.roles = data.roles;
        this.users = data.users;
        this.clients = data.clients;

        this.isEditMode = !(Object.entries(this.permission).length === 0 && this.permission.constructor === Object);
        if (this.isEditMode) {
            this.title = 'Edit Permission';
        } else {
            this.title = 'Add Permission';
        }
    }

    public ngOnInit() {
        try {
            this.userIsAdmin = this.authService.userIsAdmin();
        } catch (e) {
            console.error('Could not check if user is admin: ' + e);
            this.userIsAdmin = false;
        }

        if (this.isEditMode) {
            this.checkactiveActions();
            this.endpointControl.patchValue(this.permission.resource);
        }       

        this.initAutoComplete();
    }

    initAutoComplete() {
        try {
            this.kongService.loadUris().subscribe(uris => {
                this.uris = uris as string[];

                 // autocomplete filter
                this.filteredOptions = this.endpointControl.valueChanges
                    .pipe(
                        startWith(''),
                        map((value) => this._filter(value)),
                    );
                });
        } catch (e) {
            console.error('Could not load Uris from kong: ' + e);
        }
    }

    public checkactiveActions() {
        this.methods.patchValue({
            get: this.permission.actions.includes('GET'),
            post: this.permission.actions.includes('POST'),
            patch: this.permission.actions.includes('PATCH'),
            delete: this.permission.actions.includes('DELETE'),
            put: this.permission.actions.includes('PUT'),
            head: this.permission.actions.includes('HEAD'),
        });
    }

    public yes() {
        this.pushPolicy().subscribe(() => this.dialogRef.close('yes'),
            () => {
                this.snackBar.open('Could not update policy', undefined, {
                    duration: 3 * 1000,
                });
            });
    }

    public no() {
        this.dialogRef.close();
    }

    public pushPolicy(): Observable<unknown> {
        const policy: PermissionModel = {
            subject: this.permission.subject,
            actions: [],
            resource: this.endpointControl.value,
            id: this.permission.id,
        };
        if (this.methods.get('get')?.value === true) {
            policy.actions.push('GET');
        }
        if (this.methods.get('post')?.value === true) {
            policy.actions.push('POST');
        }
        if (this.methods.get('patch')?.value === true) {
            policy.actions.push('PATCH');
        }
        if (this.methods.get('delete')?.value === true) {
            policy.actions.push('DELETE');
        }
        if (this.methods.get('put')?.value === true) {
            policy.actions.push('PUT');
        }
        if (this.methods.get('head')?.value === true) {
            policy.actions.push('HEAD');
        }

        if (this.isEditMode) {
            return this.ladonService.putPolicies([policy]);
        } else {
            return this.ladonService.postPolicies([policy]);
        }
    }

    public onChange(event: any) {
        this.permission.mode = event;
    }


    // autocomplete filter
    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.uris.filter((option) => option.toLowerCase().includes(filterValue));
    }
}
