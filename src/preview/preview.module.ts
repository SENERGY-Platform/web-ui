/* Preview harness module - local only. */
import { Component, NgModule, ChangeDetectionStrategy } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { MockKeycloakService } from '../app/core/services/keycloak.mock';
import { LadonService } from '../app/modules/admin/permissions/shared/services/ladom.service';
import { EnvironmentsModule } from '../app/modules/environments/environments.module';
import { FixtureInterceptor } from './fixture.interceptor';
import { provideIconFontSet } from '../app/core/icon-font-set';
import { AuthorizationService } from '../app/core/services/authorization.service';
import { ErrorHandlerService } from '../app/core/services/error-handler.service';
import { PreviewKeycloakService } from './preview-keycloak.service';
import { PermissionTestResponse } from '../app/modules/admin/permissions/shared/permission.model';

@Component({
    selector: 'senergy-root',
    template: '<div style="height:100vh;display:flex;flex-direction:column"><router-outlet></router-outlet></div>',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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
        // AuthorizationService picks its Keycloak from keycloakServiceToken, which CoreModule fills with the real service.
        {
            provide: AuthorizationService,
            useFactory: (errorHandler: ErrorHandlerService, http: HttpClient) =>
                new AuthorizationService([new PreviewKeycloakService()], errorHandler, http),
            deps: [ErrorHandlerService, HttpClient],
        },
        { provide: LadonService, useClass: PreviewLadonService },
        { provide: HTTP_INTERCEPTORS, useClass: FixtureInterceptor, multi: true },
        provideIconFontSet(),
    ],
    bootstrap: [PreviewRootComponent],
})
export class PreviewModule {}
