import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AnomalyService } from './anomaly.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AnomalyService', () => {
    let service: AnomalyService;

    beforeEach(() => {
        TestBed.configureTestingModule({
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
        service = TestBed.inject(AnomalyService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
