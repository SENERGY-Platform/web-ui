import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsumptionProfileComponent } from './consumption-profile.component';

describe('ConsumptionProfileComponent', () => {
  let component: ConsumptionProfileComponent;
  let fixture: ComponentFixture<ConsumptionProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsumptionProfileComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsumptionProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
