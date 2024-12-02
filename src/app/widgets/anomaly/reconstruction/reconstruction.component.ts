import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GoogleChartComponent } from 'ng2-google-charts';
import { ChartsModel } from 'src/app/widgets/charts/shared/charts.model';
import { AnomalyResultModel } from '../shared/anomaly.model';

@Component({
    selector: 'anomaly-reconstruction',
    templateUrl: './reconstruction.component.html',
    styleUrls: ['./reconstruction.component.css']
})
export class AnomalyReconstructionComponent implements OnInit {
    chartData: any;
    ready = false;
    values = [
      [
        "2024-04-29T12:01:54.288249Z",
        1,
        2
      ],
      [
        "2024-04-29T13:01:54.288249Z",
        2,
        2
      ],
      [
        "2024-04-29T14:01:54.288249Z",
        2,
        3
      ],
    ];
  

    // Use a setter for the chart which will get called when then ngif from ready evaluates to true
    // This is needed so the element is not undefined when called later to draw
    private chartExport!: GoogleChartComponent;
    @ViewChild('chartExport', {static: false}) set content(content: GoogleChartComponent) {
        if(content) { // initially setter gets called with undefined
            this.chartExport = content;
        }
    }

    constructor(
        private dialogRef: MatDialogRef<AnomalyReconstructionComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {anomaly: AnomalyResultModel}
    ) {
        this.values = data.anomaly.original_reconstructed_curves;
    }

    onChartSelect(_: any) {

    }

    ngOnInit(): void {
        this.setupChartData();
    }

    setupChartData() {
        let dataTable: any = [["time", "expected", "true"]];
        const valueList: any = [];
        this.values.forEach(value => {
            valueList.push([new Date(value[0]), value[1], value[2]]);
        });

        valueList.sort((a: any,b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());


        // console.log(valueList)

        dataTable = dataTable.concat(valueList);

        this.chartData = new ChartsModel('LineChart', dataTable, {
            legend: {position: 'none'},
            vAxis: {
                title: 'Expected Value'
            },
            width: 1000,
            height: 500
        });
        this.chartExport?.draw();
        this.ready = true;
    }

    close(): void {
        this.dialogRef.close();
    }
}
