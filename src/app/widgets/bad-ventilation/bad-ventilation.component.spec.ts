import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadVentilationComponent } from './bad-ventilation.component';

describe('BadVentilationComponent', () => {
  let component: BadVentilationComponent;
  let fixture: ComponentFixture<BadVentilationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BadVentilationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadVentilationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
