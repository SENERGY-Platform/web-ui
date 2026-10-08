/* Preview harness root - local only. */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'senergy-root',
    template: '<div style="height:100vh;display:flex;flex-direction:column"><router-outlet></router-outlet></div>',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterOutlet]
})
export class PreviewRootComponent {
    constructor() {
        // the real app loads its theme bundle at runtime via the theme service
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // ?theme=<bundle> previews another theme
        link.href = (new URLSearchParams(location.search).get('theme') || 'senergy') + '.css';
        document.head.appendChild(link);
    }
}
