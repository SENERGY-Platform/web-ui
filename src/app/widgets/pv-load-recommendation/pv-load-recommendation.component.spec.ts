import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PvLoadRecommendationComponent } from './pv-load-recommendation.component';

describe('PvLoadRecommendationComponent', () => {
  let component: PvLoadRecommendationComponent;
  let fixture: ComponentFixture<PvLoadRecommendationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PvLoadRecommendationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PvLoadRecommendationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
