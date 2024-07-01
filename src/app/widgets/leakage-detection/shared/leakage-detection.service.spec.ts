import { TestBed } from '@angular/core/testing';

import { LeakageDetectionService } from './leakage-detection.service';

describe('LeakageDetectionService', () => {
  let service: LeakageDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeakageDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
