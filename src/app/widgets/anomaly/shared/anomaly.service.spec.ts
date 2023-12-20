import { TestBed } from '@angular/core/testing';

import { AnomalyService } from './anomaly.service';

describe('AnomalyService', () => {
  let service: AnomalyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnomalyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
