/*
 * Local preview harness - never committed, never built for production.
 * Boots the environments module and both BPMN designers against fixture data,
 * so they can be inspected in a headless browser without a platform login.
 */
import { provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { PreviewModule } from './preview/preview.module';

platformBrowserDynamic()
    .bootstrapModule(PreviewModule, { applicationProviders: [provideZoneChangeDetection()] })
    .catch((err) => console.error(err));
