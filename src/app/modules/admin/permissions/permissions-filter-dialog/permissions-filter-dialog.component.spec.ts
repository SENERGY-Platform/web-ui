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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PermissionsFilterDialogComponent } from './permissions-filter-dialog.component';

describe('PermissionsFilterDialogComponent', () => {
    let component: PermissionsFilterDialogComponent;
    let fixture: ComponentFixture<PermissionsFilterDialogComponent>;
    let close: jasmine.Spy;

    beforeEach(async () => {
        close = jasmine.createSpy('close');
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [PermissionsFilterDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        selection: { user: 'alice', role: '', client: '', endpoint: '/devices' },
                        users: ['alice', 'bob'], roles: ['admin'], clients: ['frontend'], endpoints: ['/devices', '/flows'],
                    },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(PermissionsFilterDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('preselects the current selection and offers the options of each field', () => {
        const fields = component.config.fields;
        expect(fields.map(f => f.key)).toEqual(['user', 'role', 'client', 'endpoint']);
        expect(fields.find(f => f.key === 'user')?.value).toBe('alice');
        expect(fields.find(f => f.key === 'role')?.value).toBeUndefined();
        expect(fields.find(f => f.key === 'endpoint')?.items).toEqual(['/devices', '/flows']);
    });

    it('closes with empty strings for unset fields', () => {
        component.filter({ values: { user: 'bob', role: null, client: undefined, endpoint: '/flows' }, labels: {} });

        expect(close).toHaveBeenCalledWith({ user: 'bob', role: '', client: '', endpoint: '/flows' });
    });

    it('closes without a result on cancel', () => {
        component.close();

        expect(close).toHaveBeenCalledWith();
    });
});
