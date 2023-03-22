import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { AuthorizationServiceMock } from 'src/app/core/services/authorization.service.mock';
import {CoreModule} from '../../../core/core.module';
import { SwaggerService } from '../shared/swagger/swagger.service';
import { SwaggerServiceMock } from '../shared/swagger/swagger.service.mock';
import {SingleServiceDocComponent} from './single-service-doc.component';

describe('SingleServiceDocComponent', () => {
    let component: SingleServiceDocComponent;
    let fixture: ComponentFixture<SingleServiceDocComponent>;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            declarations: [SingleServiceDocComponent],
            providers: [
                {provide: AuthorizationService, useClass: AuthorizationServiceMock},
                {
                    provide: ActivatedRoute, useValue: {
                        params: of([{id: 0}]),
                    },
                },
                {provide: SwaggerService, useClass: SwaggerServiceMock},
            ],
            imports: [
                CoreModule,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SingleServiceDocComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
