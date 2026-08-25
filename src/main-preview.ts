/*
 * Local preview harness - never committed, never built for production.
 * Boots only the environments module against fixture data, so the editor
 * can be inspected in a headless browser without a platform login.
 */
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { PreviewModule } from './preview/preview.module';

platformBrowserDynamic()
    .bootstrapModule(PreviewModule)
    .catch((err) => console.error(err));
