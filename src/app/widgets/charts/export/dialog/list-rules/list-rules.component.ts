import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ChartsExportConversion } from '../../shared/charts-export-properties.model';
import { AddRuleComponent } from '../add-rule/add-rule.component';

@Component({
  selector: 'app-list-rules',
  templateUrl: './list-rules.component.html',
  styleUrls: ['./list-rules.component.css']
})
export class ListRulesComponent {
  displayedColumns: string[] = [
    'from',
    'to',
    'color',
    'alias',
    'delete'
  ];
  dataSource = new MatTableDataSource<ChartsExportConversion>();

  saveRules() {
    this.dialogRef.close(this.dataSource.data);
  }

  delete(index: number) {
    this.dataSource.data.splice(index, 1);
    this.dataSource.data = this.dataSource.data;
  }

  add() {
    this.dialog.open(AddRuleComponent).afterClosed().subscribe({
      next: (rule: ChartsExportConversion) => {
        if(rule != null) {
          this.dataSource.data.push(rule);
          this.dataSource.data = this.dataSource.data;
        }
      },
      error: (_) => {

      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public rules: ChartsExportConversion[],
    private dialogRef: MatDialogRef<ListRulesComponent>,
    public dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource(rules);
  }

}
