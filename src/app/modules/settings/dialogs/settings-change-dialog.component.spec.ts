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

import { UntypedFormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettingsChangeDialogComponent } from './settings-change-dialog.component';
import { AuthorizationService } from '../../../core/services/authorization.service';

describe('SettingsChangeDialogComponent', () => {
    let redirectUris: string[];

    /** Direct construction (no TestBed); the document only has to carry a location. */
    const create = (origin: string, pathname: string): SettingsChangeDialogComponent => {
        redirectUris = [];
        const document = { location: { origin, pathname } } as unknown as Document;
        const authorizationService = {
            getProfile: () => Promise.resolve({ email: '', firstName: '', lastName: '', username: '' }),
            changePassword: (redirectUri: string) => {
                redirectUris.push(redirectUri);
                return Promise.resolve();
            },
        } as unknown as AuthorizationService;
        const component = new SettingsChangeDialogComponent(
            document,
            authorizationService,
            {} as MatDialogRef<SettingsChangeDialogComponent>,
            {} as MatSnackBar,
            new UntypedFormBuilder(),
        );
        component.ngOnInit();
        return component;
    };

    // A default port reads as '' from location.port, and "host:/path" is refused by Keycloak.
    it('should return to the page without an empty port', () => {
        create('https://ui.example.org', '/settings').changePassword();
        expect(redirectUris).toEqual(['https://ui.example.org/settings']);
    });

    it('should keep an explicit port', () => {
        create('http://localhost:4200', '/settings').changePassword();
        expect(redirectUris).toEqual(['http://localhost:4200/settings']);
    });
});
