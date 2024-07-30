import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { EditVentilationWidgetComponent } from './edit.component';

describe('EditVentilationWidgetComponent', () => {
  let component: EditVentilationWidgetComponent;
  let fixture: ComponentFixture<EditVentilationWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditVentilationWidgetComponent ],
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
    ],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {provide: MatDialogRef, useValue: {}},
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
