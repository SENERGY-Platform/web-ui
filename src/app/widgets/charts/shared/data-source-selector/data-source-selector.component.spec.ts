import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { DataSourceSelectorComponent } from './data-source-selector.component';

describe('DataSourceSelectorComponent', () => {
  let component: DataSourceSelectorComponent;
  let fixture: ComponentFixture<DataSourceSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataSourceSelectorComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataSourceSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
