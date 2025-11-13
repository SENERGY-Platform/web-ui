import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PipelineFilterDialogComponent } from './pipeline-filter-dialog.component';

describe('PipelineFilterDialogComponent', () => {
  let component: PipelineFilterDialogComponent;
  let fixture: ComponentFixture<PipelineFilterDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipelineFilterDialogComponent]
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
