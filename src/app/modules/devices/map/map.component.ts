import { Component, OnInit, Input, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import Map from 'ol/Map';

@Component({
  selector: 'app-map',
  template: '',
  styles: [':host { width: 100%; height: 100%; display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit {

  @Input() map?: Map;
  constructor(private elementRef: ElementRef) {
  }
  ngOnInit() {
    if (this.map !== undefined) {
      this.map.setTarget(this.elementRef.nativeElement);
    }
  }
}