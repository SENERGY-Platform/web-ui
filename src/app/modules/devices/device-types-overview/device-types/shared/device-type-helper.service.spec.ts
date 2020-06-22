import { TestBed } from '@angular/core/testing';

import { DeviceTypeHelperService } from './device-type-helper.service';

describe('DeviceTypeHelperService', () => {
  let service: DeviceTypeHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceTypeHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isEditable', () => {
    expect(service.isEditable('')).toBe(false);
    expect(service.isEditable('xxx')).toBe(false);
    expect(service.isEditable('create')).toBe(true);
    expect(service.isEditable('copy')).toBe(true);
    expect(service.isEditable('edit')).toBe(true);
    expect(service.isEditable('details')).toBe(false);
  });


});
