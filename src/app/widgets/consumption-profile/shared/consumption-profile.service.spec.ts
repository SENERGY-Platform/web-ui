import { TestBed } from '@angular/core/testing';

import { ConsumptionProfileService } from './consumption-profile.service';

describe('ConsumptionProfileService', () => {
  let service: ConsumptionProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsumptionProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
