import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PvPredictionService } from './pv-load.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PvPredictionService', () => {
  let service: PvPredictionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service = TestBed.inject(PvPredictionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
