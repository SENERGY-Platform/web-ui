import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { BadVentilationService } from './bad-ventilation.service';

describe('BadVentilationService', () => {
  let service: BadVentilationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
    ]
    });
    service = TestBed.inject(BadVentilationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
