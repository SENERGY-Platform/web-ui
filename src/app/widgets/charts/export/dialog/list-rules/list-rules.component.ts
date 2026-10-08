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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ChartsExportConversion } from '../../shared/charts-export-properties.model';
import { AddRuleComponent } from '../add-rule/add-rule.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatIconButton, MatFabButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'app-list-rules',
    templateUrl: './list-rules.component.html',
    styleUrls: ['./list-rules.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatIconButton, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatFabButton, MatDialogActions, MatButton]
})
export class ListRulesComponent {
  rules = inject(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<ListRulesComponent>>(MatDialogRef);
  dialog = inject(MatDialog);

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
    const data = this.dataSource.data.slice();
    data.splice(index, 1);
    this.dataSource.data = data;
  }

  edit(index: number) {
    const oldRule: ChartsExportConversion = this.dataSource.data[index];
    this.dialog.open(AddRuleComponent, {data: oldRule}).afterClosed().subscribe({
      next: (rule: ChartsExportConversion) => {
        if(rule != null) {
          const data = this.dataSource.data.slice();
          data.splice(index, 1);
          data.push(rule);
          this.dataSource.data = data;
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
          this.dataSource.data = [...this.dataSource.data, rule];
        }
      },
      error: (_) => {

      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  constructor() {
    const rules = this.rules;

    this.dataSource = new MatTableDataSource(rules);
  }

}
