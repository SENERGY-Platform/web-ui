/* Preview harness module - local only. */
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { MockKeycloakService } from '../app/core/services/keycloak.mock';
import { LadonService } from '../app/modules/admin/permissions/shared/services/ladom.service';
import { EnvironmentsModule } from '../app/modules/environments/environments.module';
import { FixtureInterceptor } from './fixture.interceptor';
import { PermissionTestResponse } from '../app/modules/admin/permissions/shared/permission.model';

@Component({
    selector: 'senergy-root',
    template: '<div style="height:100vh;display:flex;flex-direction:column"><router-outlet></router-outlet></div>',
})
export class PreviewRootComponent {
    constructor() {
        //the real app loads its theme bundle at runtime via the theme service
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'senergy.css';
        document.head.appendChild(link);
    }
}

class PreviewLadonService {
    getUserAuthorizationsForURI(_uri: string): PermissionTestResponse {
        return { GET: true, POST: true, PUT: true, PATCH: true, DELETE: true, HEAD: true };
    }
}

@NgModule({
    declarations: [PreviewRootComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        EnvironmentsModule,
        RouterModule.forRoot([{ path: '', redirectTo: 'environments', pathMatch: 'full' }]),
    ],
    providers: [
        { provide: KeycloakService, useClass: MockKeycloakService },
        { provide: LadonService, useClass: PreviewLadonService },
        { provide: HTTP_INTERCEPTORS, useClass: FixtureInterceptor, multi: true },
    ],
    bootstrap: [PreviewRootComponent],
})
export class PreviewModule {}
