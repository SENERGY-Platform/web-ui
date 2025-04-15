import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ConsumptionProfileEditComponent } from './edit.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ConsumptionProfileEditComponent', () => {
  let component: ConsumptionProfileEditComponent;
  let fixture: ComponentFixture<ConsumptionProfileEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [ConsumptionProfileEditComponent],
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

    fixture = TestBed.createComponent(ConsumptionProfileEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
