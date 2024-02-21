import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { OpenWindowEditComponent } from './edit.component';

describe('OpenWindowEditComponent', () => {
  let component: OpenWindowEditComponent;
  let fixture: ComponentFixture<OpenWindowEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpenWindowEditComponent ],
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA,
          useValue: {
            widget: {properties: {windowExports: []}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1}
          }
        },
        { provide: MatDialogRef, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenWindowEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
