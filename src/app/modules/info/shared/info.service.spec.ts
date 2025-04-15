import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { InfoService } from './info.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('InfoService', () => {
    let service: InfoService;

    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
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
