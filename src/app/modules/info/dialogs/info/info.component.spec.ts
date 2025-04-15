import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { InfoDialogComponent } from './info.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('InfoComponent', () => {
    let component: InfoDialogComponent;
    let fixture: ComponentFixture<InfoDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            declarations: [ InfoDialogComponent ],
            providers: [
                {provide: MatDialogRef, useValue: {}}
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(InfoDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
