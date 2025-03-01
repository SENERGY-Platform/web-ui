import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { LeakageDetectionService } from './leakage-detection.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('LeakageDetectionService', () => {
  let service: LeakageDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service = TestBed.inject(LeakageDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
