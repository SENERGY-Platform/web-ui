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

import {NgModule, Optional, SkipSelf} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {throwIfAlreadyLoaded} from './module-import-guard';
import {SidenavComponent} from './components/sidenav/sidenav.component';
import {FlexLayoutModule} from '@angular/flex-layout';
import {ToolbarComponent} from './components/toolbar/toolbar.component';
import {RouterModule} from '@angular/router';
import {SearchbarComponent} from './components/searchbar/searchbar.component';
import {SpinnerComponent} from './components/spinner/spinner.component';
import {SortComponent} from './components/sort/sort.component';
import {StateIconComponent} from './components/state-icon/state-icon.component';
import {DiagramEditorComponent} from './components/diagram-editor/diagram-editor.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TagValuePipe} from './pipe/tag-value.pipe';
import {DeleteDialogComponent} from './dialogs/delete-dialog.component';
import {ShortInputVariableNamePipe} from './pipe/short-input-variable-name.pipe';
import {ShortOutputVariableNamePipe} from './pipe/short-output-variable-name.pipe';
import {ShortInputVariableValuePipe} from './pipe/short-input-variable-value.pipe';
import {WidgetNoDataComponent} from './components/widget-no-data/widget-no-data.component';
import {MatBadgeModule} from '@angular/material/badge';
import {NotificationDialogComponent} from './components/toolbar/notification/dialog/notification-dialog.component';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatLegacyMenuModule as MatMenuModule} from '@angular/material/legacy-menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {SelectSearchComponent} from './components/select-search/select-search.component';
import {ConfirmDialogComponent} from './dialogs/confirm-dialog.component';
import {ClosableSnackBarComponent} from './components/closable-snack-bar/closable-snack-bar.component';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {InputDialogComponent} from './dialogs/input-dialog.component';
import {IsJsonValidatorDirective} from './validators/is-json-validator.directive';
import {GenericValidator} from './validators/generc-validator.directive';

@NgModule({
    imports: [
        BrowserAnimationsModule,
        MatSidenavModule,
        MatIconModule,
        MatButtonModule,
        MatToolbarModule,
        MatMenuModule,
        MatDividerModule,
        FlexLayoutModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        FormsModule,
        MatListModule,
        MatDialogModule,
        ReactiveFormsModule,
        MatBadgeModule,
        MatExpansionModule,
        MatSelectModule,
        MatPaginatorModule,
        MatCheckboxModule,
        MatTableModule,
        MatButtonToggleModule,
    ],
    declarations: [
        SidenavComponent,
        ToolbarComponent,
        SearchbarComponent,
        SpinnerComponent,
        SortComponent,
        StateIconComponent,
        DiagramEditorComponent,
        TagValuePipe,
        ShortOutputVariableNamePipe,
        ShortInputVariableNamePipe,
        ShortInputVariableValuePipe,
        DeleteDialogComponent,
        ConfirmDialogComponent,
        InputDialogComponent,
        WidgetNoDataComponent,
        NotificationDialogComponent,
        SelectSearchComponent,
        ClosableSnackBarComponent,
        IsJsonValidatorDirective,
        GenericValidator,
    ],
    exports: [
        SidenavComponent,
        ToolbarComponent,
        SearchbarComponent,
        SpinnerComponent,
        SortComponent,
        StateIconComponent,
        DiagramEditorComponent,
        TagValuePipe,
        ShortOutputVariableNamePipe,
        ShortInputVariableNamePipe,
        ShortInputVariableValuePipe,
        WidgetNoDataComponent,
        SelectSearchComponent,
        ClosableSnackBarComponent,
        IsJsonValidatorDirective,
        GenericValidator
    ],
})
export class CoreModule {
    constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
        throwIfAlreadyLoaded(parentModule, 'CoreModule');
    }
}
