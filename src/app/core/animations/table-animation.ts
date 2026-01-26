import { Injectable } from '@angular/core';
import { trigger, transition, style, animate, AnimationTriggerMetadata } from '@angular/animations';

@Injectable({ providedIn: 'root' })
export class TableRowAnimations {

  /** Returns the animation trigger to use in a table row */
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

  static getAnimationParams(cssClass: string = 'color-sidenav') {
    const color = TableRowAnimations.getColorFromClass(cssClass);
    return { highlightColor: color };
  }

  /** Helper: read the computed color of a CSS class */
  static getColorFromClass(className: string = 'color-sidenav' ): string {
    const el = document.createElement('span');
    el.className = className;
    el.style.display = 'none';
    document.body.appendChild(el);

    const color = getComputedStyle(el).color;
    document.body.removeChild(el);
    return color;
  }
}
