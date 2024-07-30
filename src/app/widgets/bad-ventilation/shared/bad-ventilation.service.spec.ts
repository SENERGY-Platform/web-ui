import { TestBed } from '@angular/core/testing';

import { BadVentilationService } from './bad-ventilation-service.service';

describe('BadVentilationService', () => {
  let service: BadVentilationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BadVentilationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
