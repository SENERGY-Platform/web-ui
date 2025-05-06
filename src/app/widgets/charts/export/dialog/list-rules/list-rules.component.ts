/*
 * Copyright 2025 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
    'edit',
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

  edit(index: number) {
    const oldRule: ChartsExportConversion = this.dataSource.data[index];
    this.dialog.open(AddRuleComponent, {data: oldRule}).afterClosed().subscribe({
      next: (rule: ChartsExportConversion) => {
        if(rule != null) {
          this.dataSource.data.splice(index, 1);
          this.dataSource.data.push(rule);
          this.dataSource.data = this.dataSource.data;
        }
      },
      error: (_) => {

      }
    });
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
