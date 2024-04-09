import { TestBed } from '@angular/core/testing';

import { PvLoadService } from './pv-load.service';

describe('PvLoadService', () => {
  let service: PvLoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PvLoadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
