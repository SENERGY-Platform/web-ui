import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ConsumptionProfileService } from './consumption-profile.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ConsumptionProfileService', () => {
  let service: ConsumptionProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service = TestBed.inject(ConsumptionProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
