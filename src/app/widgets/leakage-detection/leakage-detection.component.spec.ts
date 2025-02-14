import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { LeakageDetectionComponent } from './leakage-detection.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('LeakageDetectionComponent', () => {
  let component: LeakageDetectionComponent;
  let fixture: ComponentFixture<LeakageDetectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [LeakageDetectionComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(LeakageDetectionComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {leakageDetection: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
