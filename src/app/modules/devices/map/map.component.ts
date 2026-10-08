import { Component, OnInit, Input, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import Map from 'ol/Map';

@Component({
    selector: 'app-map',
    template: '',
    styles: [':host { width: 100%; height: 100%; display: block; }'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit {
  private elementRef = inject(ElementRef);


  @Input() map?: Map;
  ngOnInit() {
    if (this.map !== undefined) {
      this.map.setTarget(this.elementRef.nativeElement);
    }
  }
}