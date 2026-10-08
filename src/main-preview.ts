/*
 * Local preview harness - never committed, never built for production.
 * Boots the environments module and both BPMN designers against fixture data,
 * so they can be inspected in a headless browser without a platform login.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { PreviewRootComponent } from './preview/preview-root.component';
import { previewConfig } from './preview/preview.config';

bootstrapApplication(PreviewRootComponent, previewConfig).catch((err) => console.error(err));
