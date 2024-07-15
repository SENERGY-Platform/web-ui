import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReconstructionComponent } from './reconstruction.component';

describe('ReconstructionComponent', () => {
  let component: ReconstructionComponent;
  let fixture: ComponentFixture<ReconstructionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReconstructionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReconstructionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
