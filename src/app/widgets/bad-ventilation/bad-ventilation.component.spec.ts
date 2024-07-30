import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { BadVentilationComponent } from './bad-ventilation.component';

describe('BadVentilationComponent', () => {
  let component: BadVentilationComponent;
  let fixture: ComponentFixture<BadVentilationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BadVentilationComponent ],
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
    ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadVentilationComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {badVentilation: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
