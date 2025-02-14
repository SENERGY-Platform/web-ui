import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {CoreModule} from '../../../core/core.module';
import { SwaggerService } from '../shared/swagger/swagger.service';
import { SwaggerServiceMock } from '../shared/swagger/swagger.service.mock';

import {ApiDocsComponent} from './api-docs.component';
import {provideRouter} from "@angular/router";

describe('ApiDocsComponent', () => {
    let component: ApiDocsComponent;
    let fixture: ComponentFixture<ApiDocsComponent>;

    beforeEach(waitForAsync(() => {

        TestBed.configureTestingModule({
            declarations: [ApiDocsComponent],
            providers: [
                provideRouter([]),
                {provide: SwaggerService, useClass: SwaggerServiceMock},
            ],
            imports: [
                MatCardModule,
                MatIconModule,
                CoreModule,
                FormsModule,
                ReactiveFormsModule,
                MatInputModule,
            ],
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ApiDocsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
