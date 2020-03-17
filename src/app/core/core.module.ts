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
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatListModule} from '@angular/material/list';
import {MatDialogModule} from '@angular/material/dialog';


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
        DeleteDialogComponent,
        WidgetNoDataComponent,
        NotificationDialogComponent,
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
    ],
    entryComponents: [
        DeleteDialogComponent,
        NotificationDialogComponent,
    ]
})

export class CoreModule {
    constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
        throwIfAlreadyLoaded(parentModule, 'CoreModule');
    }
}
