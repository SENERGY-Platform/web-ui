import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PvLoadService } from './pv-load.service';

describe('PvLoadService', () => {
  let service: PvLoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
      ]
    });
    
    service = TestBed.inject(PvLoadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
