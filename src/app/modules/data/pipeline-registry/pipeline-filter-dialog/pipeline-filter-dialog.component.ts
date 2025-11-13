import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {OperatorModel} from '../../operator-repo/shared/operator.model';
import {FilterSelection} from '../shared/pipeline.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';

@Component({
  selector: 'app-pipeline-filter-dialog',
  templateUrl: './pipeline-filter-dialog.component.html',
  styleUrl: './pipeline-filter-dialog.component.css'
})
export class PipelineFilterDialogComponent implements OnInit {
  ready = false;
  form = new FormGroup({
    operators: new FormControl<string[]>([]),
  });

  operatorOptions: OperatorModel[] = [] as OperatorModel[];
  savedFilterSelection!: FilterSelection | undefined;

  constructor(
      private dialogRef: MatDialogRef<PipelineFilterDialogComponent>,
      private operatorService: OperatorRepoService,
      @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
  ) {
    this.savedFilterSelection = data;
  }

  ngOnInit(): void {
    this.operatorService.getOperators('',9999,0,'name','asc').subscribe((value) => {
      this.operatorOptions = value.operators;
      this.preselectFormValues();
      this.ready = true;
    });
  }

  preselectFormValues() {
    if(!this.savedFilterSelection) {
      return;
    }

    if(this.savedFilterSelection.operators != null) {
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
