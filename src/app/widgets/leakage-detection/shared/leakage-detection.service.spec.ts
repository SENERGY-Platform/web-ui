import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { LeakageDetectionService } from './leakage-detection.service';

describe('LeakageDetectionService', () => {
  let service: LeakageDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule
      ]
    });
    service = TestBed.inject(LeakageDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
