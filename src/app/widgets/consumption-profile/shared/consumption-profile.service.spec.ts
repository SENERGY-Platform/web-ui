import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ConsumptionProfileService } from './consumption-profile.service';

describe('ConsumptionProfileService', () => {
  let service: ConsumptionProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule
      ]
    });
    service = TestBed.inject(ConsumptionProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
