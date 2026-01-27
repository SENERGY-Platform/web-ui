import { Injectable } from '@angular/core';
import { trigger, transition, style, animate, AnimationTriggerMetadata } from '@angular/animations';
import { delay, map, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TableRowAnimations {

  /* Usage Note:
      In your component:
      - use getAnimationParams in AfterViewInit hook:
          animationParams = {};
          ngAfterViewInit() {
              TableRowAnimations.getAnimationParams().subscribe(p => this.animationParams = p);
          }
      - control animation with a boolean:
          animate = false; // false disables animation, true enables them. set to true after inistial data display
      In your template:
      - Add the animation toggle and params to your tr:
          <tr mat-row *matRowDef="..." [@rowAnimation]="{value: animate, params: animationParams }"></tr>
  */

  static getRowAnimation(): AnimationTriggerMetadata {
    return trigger('rowAnimation', [
      // Insert animation
      transition('void => true', [
        style({ opacity: 0, transform: 'translateY(-6px)', backgroundColor: '{{highlightColor}}' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
        animate('800ms ease-out', style({ backgroundColor: 'transparent' }))
      ]),

      // Delete animation
      transition('true => void', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(6px)' }))
      ])
    ]);
  }

  static getAnimationParams(cssClass: string = 'color-sidenav', alpha = 0.3): Observable<object> {
    return of(null).pipe(delay(200), map(_ => {
      let color = TableRowAnimations.getColorFromClass(cssClass);
      if (alpha != 1) {
        color = this.applyOpacity(color, alpha);
      }
      return { highlightColor: color };
    }));
  }

  static getColorFromClass(className: string = 'color-sidenav'): string {
    const el = document.createElement('span');
    el.className = className;
    el.style.display = 'none';
    document.body.appendChild(el);

    const color = getComputedStyle(el).color;
    document.body.removeChild(el);
    return color;
  }

  static applyOpacity(rgbColor: string, alpha: number): string {
    const match = rgbColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return rgbColor; // fallback
    const [, r, g, b] = match;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
