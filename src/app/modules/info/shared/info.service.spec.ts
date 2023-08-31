import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { InfoService } from './info.service';

describe('InfoService', () => {
  let service: InfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialog, useValue: {}}
      ]
    });
    service = TestBed.inject(InfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
