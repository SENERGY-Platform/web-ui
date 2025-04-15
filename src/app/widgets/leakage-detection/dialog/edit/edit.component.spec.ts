import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { LeakageDetectionEditComponent } from './edit.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('LeakageDetectionEditComponent', () => {
  let component: LeakageDetectionEditComponent;
  let fixture: ComponentFixture<LeakageDetectionEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [LeakageDetectionEditComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(LeakageDetectionEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
