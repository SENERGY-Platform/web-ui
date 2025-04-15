import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ConsumptionProfileComponent } from './consumption-profile.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ConsumptionProfileComponent', () => {
  let component: ConsumptionProfileComponent;
  let fixture: ComponentFixture<ConsumptionProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [ConsumptionProfileComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(ConsumptionProfileComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {consumptionProfile: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
