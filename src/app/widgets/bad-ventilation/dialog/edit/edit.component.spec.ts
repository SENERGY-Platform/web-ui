import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { EditVentilationWidgetComponent } from './edit.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('EditVentilationWidgetComponent', () => {
  let component: EditVentilationWidgetComponent;
  let fixture: ComponentFixture<EditVentilationWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [EditVentilationWidgetComponent],
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

    fixture = TestBed.createComponent(EditVentilationWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
