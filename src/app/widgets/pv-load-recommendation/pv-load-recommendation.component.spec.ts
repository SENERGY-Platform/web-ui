import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PvLoadRecommendationComponent } from './pv-load-recommendation.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PvLoadRecommendationComponent', () => {
  let component: PvLoadRecommendationComponent;
  let fixture: ComponentFixture<PvLoadRecommendationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [PvLoadRecommendationComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(PvLoadRecommendationComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {measurement: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
