// /*
//  *
//  *       2018 InfAI (CC SES)
//  *
//  *     Licensed under the Apache License, Version 2.0 (the “License”);
//  *     you may not use this file except in compliance with the License.
//  *     You may obtain a copy of the License at
//  *
//  *         http://www.apache.org/licenses/LICENSE-2.0
//  *
//  *     Unless required by applicable law or agreed to in writing, software
//  *     distributed under the License is distributed on an “AS IS” BASIS,
//  *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  *     See the License for the specific language governing permissions and
//  *     limitations under the License.
//  * /
//  */
//
// import {ComponentFixture, TestBed} from '@angular/core/testing';
// import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// import { MatAutocompleteModule } from '@angular/material/autocomplete';
// import {MatCardModule} from '@angular/material/card';
// import {MatCheckboxModule} from '@angular/material/checkbox';
// import {MatDialog, MatDialogRef} from '@angular/material/dialog';
// import {MatDialogHarness} from "@angular/material/dialog/testing";
// import { MatFormFieldModule } from '@angular/material/form-field';
// import {MatIconModule} from '@angular/material/icon';
// import {MatInputModule} from '@angular/material/input';
// import { MatSelectModule } from '@angular/material/select';
// import {MatTableModule} from '@angular/material/table';
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// import { AuthorizationService } from 'src/app/core/services/authorization.service';
// import { AuthorizationServiceMock } from 'src/app/core/services/authorization.service.mock';
// import { KongService } from '../shared/services/kong.service';
// import { KongServiceMock } from '../shared/services/kong.service.mock';
// import { LadonService } from '../shared/services/ladom.service';
// import { LadomServiceMock } from '../shared/services/ladom.service.mock';
// import {PermissionsListComponent} from './permissions-list.component';
//
// describe('PermissionsListComponent', () => {
//     let component: PermissionsListComponent;
//     let fixture: ComponentFixture<PermissionsListComponent>;
//
//     beforeEach((() => {
//         TestBed.configureTestingModule({
//             declarations: [PermissionsListComponent],
//             providers: [
//                 {provide: AuthorizationService, useClass: AuthorizationServiceMock},
//                 {provide: MatDialog, useClass: MatDialogHarness},
//                 {provide: LadonService, useClass: LadomServiceMock},
//                 {provide: KongService, useClass: KongServiceMock},
//             ],
//             imports: [
//                 MatCardModule,
//                 MatCheckboxModule,
//                 MatIconModule,
//                 MatTableModule,
//                 MatAutocompleteModule,
//                 MatFormFieldModule,
//                 FormsModule,
//                 BrowserAnimationsModule,
//                 MatSelectModule,
//                 ReactiveFormsModule,
//                 MatInputModule,
//             ],
//         }).compileComponents();
//     }));
//
//     beforeEach(() => {
//         fixture = TestBed.createComponent(PermissionsListComponent);
//         component = fixture.componentInstance;
//         fixture.detectChanges();
//     });
//
// });
