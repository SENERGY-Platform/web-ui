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

  it('test isEditable', () => {
    expect(service.isEditable('')).toBe(false);
    expect(service.isEditable('xxx')).toBe(false);
    expect(service.isEditable('create')).toBe(true);
    expect(service.isEditable('copy')).toBe(true);
    expect(service.isEditable('edit')).toBe(true);
    expect(service.isEditable('details')).toBe(false);
  });

  it('test checkIfContentExists', () => {
    expect(service.checkIfContentExists(undefined, null)).toBe(false);
    expect(service.checkIfContentExists('', null)).toBe(false);
    expect(service.checkIfContentExists(null, null)).toBe(false);
    expect(service.checkIfContentExists(undefined, '')).toBe(false);
    expect(service.checkIfContentExists('', '')).toBe(false);
    expect(service.checkIfContentExists(null, '')).toBe(false);
    expect(service.checkIfContentExists('x', 'x')).toBe(true);
  });


});
