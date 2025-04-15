import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ListRulesComponent } from './list-rules.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ListRulesComponent', () => {
  let component: ListRulesComponent;
  let fixture: ComponentFixture<ListRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
      declarations: [ ListRulesComponent ],
      imports: [
        MatDialogModule
      ],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: []},
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
