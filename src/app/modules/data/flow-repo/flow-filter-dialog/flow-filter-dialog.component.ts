import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {map} from 'rxjs';
import {FilterDialogConfigModel, FilterDialogResultModel} from 'src/app/core/components/filter-dialog/shared/filter-dialog.model';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {FilterSelection} from '../shared/flow.model';

@Component({
    selector: 'app-flow-filter-dialog',
    templateUrl: './flow-filter-dialog.component.html',
})
export class FlowFilterDialogComponent implements OnInit {
    config: FilterDialogConfigModel = { fields: [] };
    savedFilterSelection!: FilterSelection | undefined;

    constructor(
        private dialogRef: MatDialogRef<FlowFilterDialogComponent>,
        private operatorService: OperatorRepoService,
        @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
    ) {
        this.savedFilterSelection = data;
    }

    ngOnInit(): void {
        this.config = {
            fields: [
                {
                    key: 'operators', label: 'Operator', type: 'multiselect', icon: 'settings', section: 'Flow',
                    items$: this.operatorService.getOperators('', 9999, 0, 'name', 'asc').pipe(map(value => value.operators)),
                    bindLabel: 'name', bindValue: '_id', value: this.savedFilterSelection?.operators,
                },
            ]
        };
    }

    filter(result: FilterDialogResultModel): void {
        this.dialogRef.close({
            operators: result.values['operators'] || [],
            operatorNames: result.labels['operators'],
        } as FilterSelection);
    }

    close(): void {
        this.dialogRef.close();
    }
}
