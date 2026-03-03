import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlowFilterDialogComponent } from './flow-filter-dialog.component';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {of} from 'rxjs';
import {provideHttpClient, withInterceptorsFromDi} from "@angular/common/http";

describe('FlowFilterDialogComponent', () => {
  let component: FlowFilterDialogComponent;
  let fixture: ComponentFixture<FlowFilterDialogComponent>;

  const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
  dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

  beforeEach(async () => {
    await TestBed.configureTestingModule({
        imports: [MatDialogModule],
        declarations: [FlowFilterDialogComponent],
        providers: [
            {provide: MatDialog, useValue: dialogSpy},
            { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
            { provide: MAT_DIALOG_DATA, useValue: undefined },
            provideHttpClient(withInterceptorsFromDi()),
        ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlowFilterDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
