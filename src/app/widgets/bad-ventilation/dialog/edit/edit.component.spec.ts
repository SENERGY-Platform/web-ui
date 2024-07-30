import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditVentilationWidgetComponent } from './edit.component';

describe('EditVentilationWidgetComponent', () => {
  let component: EditVentilationWidgetComponent;
  let fixture: ComponentFixture<EditVentilationWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditVentilationWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditVentilationWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
