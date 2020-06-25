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
import {OperatorRepoComponent} from './operator-repo.component';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {OperatorRepoService} from './shared/operator-repo.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {MatDialogModule} from '@angular/material/dialog';
import {AuthorizationServiceMock} from '../../../core/services/authorization.service.mock';
import {CoreModule} from '../../../core/core.module';
import {MatIconModule} from '@angular/material/icon';

class MockOperatorRepoService {
}

describe('OperatorRepoComponent', () => {
  let fixture: ComponentFixture<OperatorRepoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule, MatDialogModule, CoreModule, MatIconModule],
      declarations: [ OperatorRepoComponent ],
      providers: [
        { provide: OperatorRepoService, useClass: MockOperatorRepoService },
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
          DialogsService
      ]
    });
    fixture = TestBed.createComponent(OperatorRepoComponent);
  }));

  it('should create', () => {
    expect(fixture).toBeTruthy();
  });
});
