import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatTableModule} from '@angular/material/table';
import {PermissionsListComponent} from './permissions/permissions-list/permissions-list.component';
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
import {PermissionsEditComponent} from './permissions/permissions-edit/permissions-edit.component';
import {
    PermissionsDialogImportComponent
} from './permissions/permissions-dialog-import/permissions-dialog-import.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {Route, RouterModule} from '@angular/router';
import {CoreModule} from '../../core/core.module';
import {TimescaleRulesComponent} from './timescale-rules/timescale-rules.component';
import {FlexLayoutModule, FlexModule} from '@angular/flex-layout';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {WidgetModule} from '../../widgets/widget.module';
import {
    TimescaleRulesCreateEditComponent
} from './timescale-rules/timescale-rules-create-edit/timescale-rules-create-edit.component';
import {MatPaginatorModule} from '@angular/material/paginator';
import { BudgetComponent } from './budget/budget.component';
import { BudgetCreateEditComponent } from './budget/budget-create-edit/budget-create-edit.component';
import {
    TimescaleRulesCreateEditTemplateComponent
} from './timescale-rules/timescale-rules-create-edit-template/timescale-rules-create-edit-template.component';
import {MatExpansionModule} from '@angular/material/expansion';

const listRules: Route[] = [
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
    },
    {
        path: 'admin/budgets',
        pathMatch: 'full',
        component: BudgetComponent,
        data: {header: 'Budgets'},
    }];

@NgModule({
    declarations: [
        PermissionsListComponent,
        PermissionsEditComponent,
        PermissionsDialogImportComponent,
        TimescaleRulesComponent,
        TimescaleRulesCreateEditComponent,
        TimescaleRulesCreateEditTemplateComponent,
        BudgetComponent,
        BudgetCreateEditComponent
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
        WidgetModule,
        MatPaginatorModule,
        FlexLayoutModule,
        MatExpansionModule
    ]
})
export class AdminModule {
}
