import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {map} from 'rxjs';
import {FilterDialogConfigModel, FilterDialogResultModel} from 'src/app/core/components/filter-dialog/shared/filter-dialog.model';
import {FilterSelection} from '../shared/pipeline.model';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {FlowRepoService} from '../../flow-repo/shared/flow-repo.service';

@Component({
    selector: 'app-pipeline-filter-dialog',
    templateUrl: './pipeline-filter-dialog.component.html',
})
export class PipelineFilterDialogComponent implements OnInit {
    config: FilterDialogConfigModel = { fields: [] };
    savedFilterSelection!: FilterSelection | undefined;

    constructor(
      private dialogRef: MatDialogRef<PipelineFilterDialogComponent>,
      private operatorService: OperatorRepoService,
      private flowRepoService: FlowRepoService,
      @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
    ) {
        this.savedFilterSelection = data;
    }

    ngOnInit(): void {
        this.config = {
            fields: [
                {
                    key: 'operators', label: 'Operator', type: 'multiselect', icon: 'settings', section: 'Pipeline',
                    items$: this.operatorService.getOperators('', 9999, 0, 'name', 'asc').pipe(map(value => value.operators)),
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
