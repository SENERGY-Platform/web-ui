import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceInstancesFilterDialogComponent } from './device-instances-filter-dialog.component';

describe('DeviceInstancesFilterDialogComponent', () => {
  let component: DeviceInstancesFilterDialogComponent;
  let fixture: ComponentFixture<DeviceInstancesFilterDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeviceInstancesFilterDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviceInstancesFilterDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
