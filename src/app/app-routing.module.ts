/*
 * Copyright 2020 InfAI (CC SES)
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

import { NgModule } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  PreloadingStrategy,
  Route,
  RouterModule,
  UrlMatcher,
  UrlSegment,
  UrlMatchResult,
} from '@angular/router';

type Prefix = string;

const startsWithMatcher = (...prefixes: Prefix[]): UrlMatcher => {
  return (segments: UrlSegment[]): UrlMatchResult | null => {
    const firstSegment = segments[0]?.path;
    if (!firstSegment || !prefixes.includes(firstSegment)) {
      return null;
    }
    return { consumed: [] };
  };
};

export class SelectiveChunkPreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] === true ? load() : of(null);
  }
}

const init: Route = { path: '', redirectTo: 'dashboard', pathMatch: 'full', data: { preload: false } };
const dashboardModule: Route = {
  matcher: startsWithMatcher('dashboard'),
  loadChildren: () => import('./modules/dashboard/dashboard.module').then((m) => m.DashboardModule),
  data: { preload: true },
};
const devicesModule: Route = {
  matcher: startsWithMatcher('devices'),
  loadChildren: () => import('./modules/devices/devices.module').then((m) => m.DevicesModule),
  data: { preload: true },
};
const dataModule: Route = {
  matcher: startsWithMatcher('data'),
  loadChildren: () => import('./modules/data/data.module').then((m) => m.DataModule),
  data: { preload: true },
};
const exportsModule: Route = {
  matcher: startsWithMatcher('exports'),
  loadChildren: () => import('./modules/exports/export.module').then((m) => m.ExportModule),
  data: { preload: true },
};
const processesModule: Route = {
  matcher: startsWithMatcher('processes'),
  loadChildren: () => import('./modules/processes/processes.module').then((m) => m.ProcessesModule),
  data: { preload: true },
};
const smartServicesModule: Route = {
  matcher: startsWithMatcher('smart-services'),
  loadChildren: () => import('./modules/smart-services/smart-services.module').then((m) => m.SmartServicesModule),
  data: { preload: true },
};
const metadataModule: Route = {
  matcher: startsWithMatcher('metadata'),
  loadChildren: () => import('./modules/metadata/metadata.module').then((m) => m.MetadataModule),
  data: { preload: true },
};
const importsModule: Route = {
  matcher: startsWithMatcher('imports'),
  loadChildren: () => import('./modules/imports/imports.module').then((m) => m.ImportsModule),
  data: { preload: true },
};
const adminModule: Route = {
  matcher: startsWithMatcher('admin'),
  loadChildren: () => import('./modules/admin/admin.module').then((m) => m.AdminModule),
  data: { preload: false },
};
const reportingModule: Route = {
  matcher: startsWithMatcher('reporting'),
  loadChildren: () => import('./modules/reporting/reporting.module').then((m) => m.ReportingModule),
  data: { preload: true },
};
const credentialsModule: Route = {
  matcher: startsWithMatcher('credentials'),
  loadChildren: () => import('./modules/credentials/credentials.module').then((m) => m.CredentialsModule),
  data: { preload: true },
};
const costsModule: Route = {
  matcher: startsWithMatcher('costs'),
  loadChildren: () => import('./modules/cost/cost.module').then((m) => m.CostModule),
  data: { preload: true },
};
const devModule: Route = {
  path: 'dev',
  loadChildren: () => import('./modules/api-doc/api-doc.module').then((m) => m.ApiDocModule),
  data: { preload: false },
};

@NgModule({
  imports: [
    RouterModule.forRoot(
      [
        init,
        dashboardModule,
        devicesModule,
        dataModule,
        exportsModule,
        processesModule,
        smartServicesModule,
        metadataModule,
        importsModule,
        adminModule,
        reportingModule,
        credentialsModule,
        costsModule,
        devModule,
      ],
      {
        preloadingStrategy: SelectiveChunkPreloadStrategy,
      }
    ),
  ],
  providers: [SelectiveChunkPreloadStrategy],
  exports: [RouterModule],
})
export class AppRoutingModule {}
