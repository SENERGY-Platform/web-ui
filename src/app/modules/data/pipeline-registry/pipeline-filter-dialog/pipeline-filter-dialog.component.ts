import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {OperatorModel} from '../../operator-repo/shared/operator.model';
import {FilterSelection} from '../shared/pipeline.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {FlowModel} from "../../flow-repo/shared/flow.model";
import {FlowRepoService} from "../../flow-repo/shared/flow-repo.service";
import {forkJoin} from "rxjs";

@Component({
  selector: 'app-pipeline-filter-dialog',
  templateUrl: './pipeline-filter-dialog.component.html',
  styleUrl: './pipeline-filter-dialog.component.css'
})
export class PipelineFilterDialogComponent implements OnInit {
  ready = false;
  form = new FormGroup({
    operators: new FormControl<string[]>([]),
      flows: new FormControl<string[]>([]),
  });

  operatorOptions: OperatorModel[] = [] as OperatorModel[];
    flowsOptions: FlowModel[] = [] as FlowModel[];
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
      forkJoin({
          operators: this.operatorService.getOperators('', 9999, 0, 'name', 'asc'),
          flows: this.flowRepoService.getFlows('',9999, 0, 'name', 'asc'),
      }).subscribe((value) => {
              this.operatorOptions = value.operators.operators;
              this.flowsOptions = value.flows.flows;
              this.preselectFormValues();
              this.ready = true;
          }
      );
  }

  preselectFormValues() {
    if(!this.savedFilterSelection) {
      return;
    }

    if(this.savedFilterSelection.operators != null) {
      this.form.controls.operators.patchValue(this.savedFilterSelection.operators);
    }
      if(this.savedFilterSelection.flows != null) {
          this.form.controls.flows.patchValue(this.savedFilterSelection.flows);
      }
  }

  filter() {
    const filterSelection: FilterSelection = this.form.value as FilterSelection;
    filterSelection.operatorNames = [];
      filterSelection.flowNames = [];
    filterSelection.operators?.forEach(op => {
      filterSelection.operatorNames?.push(this.operatorOptions.find(d => d._id === op)?.name || '');
    });
      filterSelection.flows?.forEach(fl => {
          filterSelection.flowNames?.push(this.flowsOptions.find(d => d._id === fl)?.name || '');
      });
    this.dialogRef.close(filterSelection);
  }

  close(): void {
    this.dialogRef.close();
  }

  resetOperatorFilter() {
    this.form.controls.operators.patchValue([]);
  }
    resetFlowFilter() {
        this.form.controls.flows.patchValue([]);
    }
}
