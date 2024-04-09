import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PvPredictionComponent } from './pv-prediction.component';

describe('PvPredictionComponent', () => {
  let component: PvPredictionComponent;
  let fixture: ComponentFixture<PvPredictionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PvPredictionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PvPredictionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
