/*
 * Copyright 2020 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {FlowRepoComponent} from './flow-repo.component';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatDialogModule} from '@angular/material/dialog';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {AuthorizationServiceMock} from '../../../core/services/authorization.service.mock';

describe('FlowRepoComponent', () => {
  let component: FlowRepoComponent;
  let fixture: ComponentFixture<FlowRepoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule, MatDialogModule],
      declarations: [ FlowRepoComponent ],
      providers: [
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
        DialogsService
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowRepoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
