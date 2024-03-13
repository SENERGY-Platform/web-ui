import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ValueHighlightConfig } from '../../shared/single-value.model';
import { AddThresholdComponent } from '../add-threshold/add-threshold.component';

@Component({
    selector: 'single-value-threshold',
    templateUrl: './threshold.component.html',
    styleUrls: ['./threshold.component.css']
})
export class ThresholdComponent implements OnInit {
    displayedColumns = ['threshold', 'direction', 'color', 'edit', 'delete'];
    dataSource = new MatTableDataSource<ValueHighlightConfig>();
    @Output() threshholdConfigUpdated = new EventEmitter<ValueHighlightConfig[]>();
    @Input() oldConfigs: ValueHighlightConfig[] = [];

    constructor(
        public dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.dataSource = new MatTableDataSource(this.oldConfigs);
    }

    edit(index: number) {
        const oldConfig = this.dataSource.data[index];
        this.dialog.open(AddThresholdComponent, {data: oldConfig}).afterClosed().subscribe({
            next: (rule: ValueHighlightConfig) => {
                if(rule != null) {
                    this.dataSource.data.splice(index, 1);
                    this.dataSource.data.push(rule);
                    this.dataSource.data = this.dataSource.data;
                    this.emitCurrentConfig();
                }
            },
            error: (_) => {
            }
        });
    }

    delete(index: number) {
        this.dataSource.data.splice(index, 1);
        this.dataSource.data = this.dataSource.data;
        this.emitCurrentConfig();
    }

    add() {
        this.dialog.open(AddThresholdComponent).afterClosed().subscribe({
            next: (rule: ValueHighlightConfig) => {
                if(rule != null) {
                    this.dataSource.data.push(rule);
                    this.dataSource.data = this.dataSource.data;
                    this.emitCurrentConfig();
                }
            },
            error: (_) => {
            }
        });
    }

    emitCurrentConfig() {
        this.threshholdConfigUpdated.emit(this.dataSource.data);
    }
}
