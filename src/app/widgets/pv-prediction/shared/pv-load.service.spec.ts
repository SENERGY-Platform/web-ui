import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PvPredictionService } from './pv-load.service';

describe('PvPredictionService', () => {
  let service: PvPredictionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
      ]
    });
    service = TestBed.inject(PvPredictionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
