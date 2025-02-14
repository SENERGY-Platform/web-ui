import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { OpenWindowComponent } from './open-window.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('OpenWindowComponent', () => {
  let component: OpenWindowComponent;
  let fixture: ComponentFixture<OpenWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [OpenWindowComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(OpenWindowComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {windowExports: []}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
