import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {map} from 'rxjs';
import {FilterDialogConfigModel, FilterDialogResultModel} from 'src/app/core/components/filter-dialog/shared/filter-dialog.model';
import {FilterSelection} from '../shared/pipeline.model';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {FlowRepoService} from '../../flow-repo/shared/flow-repo.service';
import { FilterDialogComponent } from '../../../../core/components/filter-dialog/filter-dialog.component';

@Component({
    selector: 'app-pipeline-filter-dialog',
    templateUrl: './pipeline-filter-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FilterDialogComponent]
})
export class PipelineFilterDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<PipelineFilterDialogComponent>>(MatDialogRef);
    private operatorService = inject(OperatorRepoService);
    private flowRepoService = inject(FlowRepoService);

    config: FilterDialogConfigModel = { fields: [] };
    savedFilterSelection!: FilterSelection | undefined;

    constructor() {
        const data = inject<FilterSelection | undefined>(MAT_DIALOG_DATA);

        this.savedFilterSelection = data;
    }

    ngOnInit(): void {
        this.config = {
            fields: [
                {
                    key: 'operators', label: 'Operator', type: 'multiselect', icon: 'settings', section: 'Pipeline',
                    items$: this.operatorService.getAllOperators().pipe(map(value => value.operators)),
                    bindLabel: 'name', bindValue: '_id', value: this.savedFilterSelection?.operators,
                },
                {
                    key: 'flows', label: 'Flow', type: 'multiselect', icon: 'loop', section: 'Pipeline',
                    items$: this.flowRepoService.getFlows('', 9999, 0, 'name', 'asc').pipe(map(value => value.flows)),
                    bindLabel: 'name', bindValue: '_id', value: this.savedFilterSelection?.flows,
                },
            ]
        };
    }

    filter(result: FilterDialogResultModel): void {
        this.dialogRef.close({
            operators: result.values['operators'] || [],
            operatorNames: result.labels['operators'],
            flows: result.values['flows'] || [],
            flowNames: result.labels['flows'],
        } as FilterSelection);
    }

    close(): void {
        this.dialogRef.close();
    }
}
