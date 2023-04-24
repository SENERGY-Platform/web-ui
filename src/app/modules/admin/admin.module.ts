import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {PermissionsListComponent} from './permissions/permissions-list/permissions-list.component';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatSortModule} from '@angular/material/sort';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {PermissionsEditComponent} from './permissions/permissions-edit/permissions-edit.component';
import {
    PermissionsDialogDeleteComponent
} from './permissions/permissions-dialog-delete/permissions-dialog-delete.component';
import {
    PermissionsDialogImportComponent
} from './permissions/permissions-dialog-import/permissions-dialog-import.component';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {RouterModule} from '@angular/router';
import {CoreModule} from '../../core/core.module';
import {TimescaleRulesComponent} from './timescale-rules/timescale-rules.component';
import {FlexModule} from '@angular/flex-layout';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {WidgetModule} from '../../widgets/widget.module';
import {
    TimescaleRulesCreateEditComponent
} from './timescale-rules/timescale-rules-create-edit/timescale-rules-create-edit.component';

const listRules = [
    {
        path: 'admin/authorization',
        pathMatch: 'full',
        component: PermissionsListComponent,
        data: {header: 'Authorization'},
    },
    {
        path: 'admin/timescale-rules',
        pathMatch: 'full',
        component: TimescaleRulesComponent,
        data: {header: 'Timescale Rules'},
    }];

@NgModule({
    declarations: [
        PermissionsListComponent,
        PermissionsEditComponent,
        PermissionsDialogImportComponent,
        PermissionsDialogDeleteComponent,
        TimescaleRulesComponent,
        TimescaleRulesCreateEditComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatAutocompleteModule,
        MatCheckboxModule,
        MatCardModule,
        MatDialogModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatTableModule,
        MatTooltipModule,
        MatSortModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatRadioModule,
        MatInputModule,
        RouterModule.forChild(listRules),
        CoreModule,
        FlexModule,
        InfiniteScrollModule,
        WidgetModule
    ]
})
export class AdminModule {
}
