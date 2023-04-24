import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {RouterTestingModule} from '@angular/router/testing';
import {CoreModule} from '../../../core/core.module';
import { SwaggerService } from '../shared/swagger/swagger.service';
import { SwaggerServiceMock } from '../shared/swagger/swagger.service.mock';

import {ApiDocsComponent} from './api-docs.component';

describe('ApiDocsComponent', () => {
    let component: ApiDocsComponent;
    let fixture: ComponentFixture<ApiDocsComponent>;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            declarations: [ApiDocsComponent],
            providers: [
                {provide: SwaggerService, useClass: SwaggerServiceMock},
            ],
            imports: [
                MatCardModule,
                MatIconModule,
                CoreModule,
                FormsModule,
                ReactiveFormsModule,
                MatInputModule,
                RouterTestingModule,
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
