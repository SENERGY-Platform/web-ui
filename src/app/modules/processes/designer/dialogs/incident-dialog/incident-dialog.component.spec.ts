import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentDialogComponent } from './incident-dialog.component';

describe('IncidentDialogComponent', () => {
  let component: IncidentDialogComponent;
  let fixture: ComponentFixture<IncidentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IncidentDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
