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

import { MatDialogRef } from '@angular/material/dialog';
import { EnvironmentsCreateDialogComponent } from './environments-create-dialog.component';
import { Environment, EnvironmentType } from '../shared/environments.model';

describe('EnvironmentsCreateDialogComponent', () => {
    let dialogRef: jasmine.SpyObj<MatDialogRef<EnvironmentsCreateDialogComponent>>;

    beforeEach(() => {
        dialogRef = jasmine.createSpyObj<MatDialogRef<EnvironmentsCreateDialogComponent>>('MatDialogRef', ['close']);
    });

    const created = (name: string, type: EnvironmentType): Environment => {
        const component = new EnvironmentsCreateDialogComponent(dialogRef);
        component.name = name;
        component.type = type;
        component.create();
        return dialogRef.close.calls.mostRecent().args[0] as Environment;
    };

    // The api refuses an environment without a zone, so a dialog closing with
    // only name and type produces a create that always fails with 400.
    it('carries a starter zone, so the api accepts the document', () => {
        const env = created('Metallbau Musterstadt', 'industrial_site');
        expect(env.zones?.length).toBe(1);
        expect(env.zones?.[0].name).toBeTruthy();
    });

    it('picks a starter zone type that fits the environment type', () => {
        expect(created('Werk', 'industrial_site').zones?.[0].type).toBe('site');
        expect(created('Wohnung 3', 'apartment').zones?.[0].type).toBe('unit');
        expect(created('Bürohaus', 'office_building').zones?.[0].type).toBe('building');
    });

    it('does not close without a name or a type', () => {
        const component = new EnvironmentsCreateDialogComponent(dialogRef);
        component.name = '';
        component.type = 'industrial_site';
        component.create();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    // The user should see a real value in the Editor's Seed field right away, not an
    // empty one they have to think to fill in themselves.
    it('assigns a random integer seed in [1, 999999]', () => {
        const env = created('Werk', 'industrial_site');
        expect(Number.isInteger(env.seed)).toBe(true);
        expect(env.seed as number).toBeGreaterThanOrEqual(1);
        expect(env.seed as number).toBeLessThanOrEqual(999999);
    });

    it('assigns a different seed on repeated creates (not a fixed constant)', () => {
        const seeds = new Set(Array.from({ length: 20 }, () => created('Werk', 'industrial_site').seed));
        expect(seeds.size).toBeGreaterThan(1);
    });
});
