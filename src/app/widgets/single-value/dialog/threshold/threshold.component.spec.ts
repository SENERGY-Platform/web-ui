import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ThresholdComponent } from './threshold.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ThresholdComponent', () => {
  let component: ThresholdComponent;
  let fixture: ComponentFixture<ThresholdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [ThresholdComponent],
    imports: [MatSnackBarModule,
        MatDialogModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(ThresholdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
