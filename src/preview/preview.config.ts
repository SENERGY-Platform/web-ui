/* Preview harness providers - local only. */
import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { MockKeycloakService } from '../app/core/services/keycloak.mock';
import { LadonService } from '../app/modules/admin/permissions/shared/services/ladom.service';
import { EnvironmentsModule } from '../app/modules/environments/environments.module';
import { ProcessesModule } from '../app/modules/processes/processes.module';
import { SmartServicesModule } from '../app/modules/smart-services/smart-services.module';
import { FlowDesignerModule } from '../app/modules/data/flow-designer/flow-designer.module';
import { FixtureInterceptor } from './fixture.interceptor';
import { WidgetModule } from '../app/widgets/widget.module';
import { ChartsPreviewComponent } from './charts-preview.component';
import { provideIconFontSet } from '../app/core/icon-font-set';
import { provideOverlayDefaults } from '../app/core/overlay-defaults';
import { AuthorizationService } from '../app/core/services/authorization.service';
import { ErrorHandlerService } from '../app/core/services/error-handler.service';
import { PreviewKeycloakService } from './preview-keycloak.service';
import { PermissionTestResponse } from '../app/modules/admin/permissions/shared/permission.model';

class PreviewLadonService {
    getUserAuthorizationsForURI(_uri: string): PermissionTestResponse {
        return { GET: true, POST: true, PUT: true, PATCH: true, DELETE: true, HEAD: true };
    }
}

export const previewConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection(),
        provideAnimations(),
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        importProvidersFrom(EnvironmentsModule, ProcessesModule, SmartServicesModule, FlowDesignerModule, WidgetModule),
        provideRouter([
            { path: '', redirectTo: 'environments', pathMatch: 'full' },
            { path: 'charts/:name', component: ChartsPreviewComponent },
        ]),
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
        provideOverlayDefaults(),
    ],
};
