import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PipelineFilterDialogComponent } from './pipeline-filter-dialog.component';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {of} from 'rxjs';
import {provideHttpClient, withInterceptorsFromDi} from "@angular/common/http";

describe('PipelineFilterDialogComponent', () => {
  let component: PipelineFilterDialogComponent;
  let fixture: ComponentFixture<PipelineFilterDialogComponent>;

  const dialogSpy: Spy<MatDialog> = createSpyFromClass(MatDialog);
  dialogSpy.open.and.returnValue({afterClosed: () => of(true)});

  beforeEach(async () => {
    await TestBed.configureTestingModule({
        imports: [MatDialogModule],
        declarations: [PipelineFilterDialogComponent],
        providers: [
            {provide: MatDialog, useValue: dialogSpy},
            { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
            { provide: MAT_DIALOG_DATA, useValue: undefined },
            provideHttpClient(withInterceptorsFromDi()),
        ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PipelineFilterDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
