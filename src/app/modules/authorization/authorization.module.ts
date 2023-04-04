import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    ReactiveFormsModule
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { PermissionsListComponent } from './shared/permissions-list/permissions-list.component';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatSortModule} from '@angular/material/sort';
import {MatTooltipModule} from '@angular/material/tooltip';
import { PermissionsEditComponent } from './shared/permissions-edit/permissions-edit.component';
import { PermissionsDialogDeleteComponent } from './shared/permissions-dialog-delete/permissions-dialog-delete.component';
import { PermissionsDialogImportComponent } from './shared/permissions-dialog-import/permissions-dialog-import.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import {CoreModule} from '../../core/core.module';

const listRules = {
    path: 'admin/authorization',
    pathMatch: 'full',
    component: PermissionsListComponent,
    data: { header: 'Authorization' },
};

@NgModule({
    declarations: [
        PermissionsListComponent,
        PermissionsEditComponent,
        PermissionsDialogImportComponent,
        PermissionsDialogDeleteComponent
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
        RouterModule.forChild([
            listRules
        ]),
        CoreModule
    ]
})
export class AuthorizationModule { }
