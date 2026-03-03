import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {OperatorModel} from '../../operator-repo/shared/operator.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {forkJoin} from 'rxjs';
import {FilterSelection} from '../shared/flow.model';

@Component({
    selector: 'app-flow-filter-dialog',
    templateUrl: './flow-filter-dialog.component.html',
    styleUrl: './flow-filter-dialog.component.css'
})
export class FlowFilterDialogComponent implements OnInit {
    ready = false;
    form = new FormGroup({
        operators: new FormControl<string[]>([]),
    });

    operatorOptions: OperatorModel[] = [] as OperatorModel[];
    savedFilterSelection!: FilterSelection | undefined;

    constructor(
        private dialogRef: MatDialogRef<FlowFilterDialogComponent>,
        private operatorService: OperatorRepoService,
        @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
    ) {
        this.savedFilterSelection = data;
    }

    ngOnInit(): void {
        forkJoin({
            operators: this.operatorService.getOperators('', 9999, 0, 'name', 'asc'),
        }).subscribe((value) => {
                this.operatorOptions = value.operators.operators;
                this.preselectFormValues();
                this.ready = true;
            }
        );
    }

    preselectFormValues() {
        if (!this.savedFilterSelection) {
            return;
        }

        if (this.savedFilterSelection.operators != null) {
            this.form.controls.operators.patchValue(this.savedFilterSelection.operators);
        }
    }

    filter() {
        const filterSelection: FilterSelection = this.form.value as FilterSelection;
        filterSelection.operatorNames = [];
        filterSelection.operators?.forEach(op => {
            filterSelection.operatorNames?.push(this.operatorOptions.find(d => d._id === op)?.name || '');
        });
        this.dialogRef.close(filterSelection);
    }

    close(): void {
        this.dialogRef.close();
    }

    resetOperatorFilter() {
        this.form.controls.operators.patchValue([]);
    }

}
