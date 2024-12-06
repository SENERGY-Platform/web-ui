import { Component, HostListener, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { ChartsExportVAxesModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { AnomaliesPerDevice } from '../../shared/anomaly.model';
import { AnomalyReconstructionComponent } from '../../reconstruction/reconstruction.component';
import { AnomalyService } from '../../shared/anomaly.service';
import moment, { DurationInputArg1, unitOfTime } from 'moment';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';

@Component({
    selector: 'anomaly-phases',
    templateUrl: './anomaly-phases.component.html',
    styleUrls: ['./anomaly-phases.component.css']
})
export class AnomalyPhasesComponent implements OnInit, OnChanges {
    @Input() anomalies: AnomaliesPerDevice = {};
    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() deviceIDs: string[] = [];
    @Input() widget?: WidgetModel;
    @Input() widgetHeight = 0;
    @Input() widgetWidth = 0;
    curveAnomaliesPerDevice: AnomaliesPerDevice = {};

    // Timeline
    anomaliePhases: any = [];
    timelineWidth = 0;
    timelineHeight = 0;
    vAxes: ChartsExportVAxesModel[] = [];
    chartDataReady = false;

    self = this;

    constructor(
        private dialog: MatDialog,
        private anomalyService: AnomalyService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        const widgetWidth = changes['widgetWidth'];
        const widgetHeight = changes['widgetHeight'];
        if(widgetWidth != null) {
            this.timelineWidth = widgetWidth.currentValue;
        }

        if(widgetHeight != null) {
            this.timelineHeight = widgetHeight.currentValue;
        }
    }


    filterCurveAnomalies() {
        this.deviceIDs.forEach(deviceID => {
            const anomalies = this.anomalies[deviceID];
            const curveAnomalies = anomalies.filter((anomaly) => anomaly.type === 'curve');
            this.curveAnomaliesPerDevice[deviceID] = curveAnomalies;
        });
    }

    ngOnInit(): void {
        // console.log(this.curveAnomaliesPerDevice)
        this.filterCurveAnomalies();

        // data must be sorted by descending time for timeline chart
        const timeRangeConfig = this.widget?.properties.anomalyDetection?.timeRangeConfig?.timeRange;
        if(timeRangeConfig == null) {
            throw new Error('Time Range not configured');
        }
        const time = timeRangeConfig.time || '1';
        const level = timeRangeConfig.level || 'd';
        const earliestStartTime = moment().subtract(time as DurationInputArg1, level as unitOfTime.DurationConstructor).toDate();
        this.anomaliePhases = this.anomalyService.createPhaseWindows(this.curveAnomaliesPerDevice, earliestStartTime);
        this.anomaliePhases.sort((a: any,b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

        const phasesTimescale: any = [];
        this.anomaliePhases.forEach((phase: any) => {
            phasesTimescale.push([phase]);
        });

        this.anomaliePhases = phasesTimescale;
        this.createVAxes();
        this.chartDataReady = true;
    }

    createVAxes() {
        this.deviceIDs.forEach(deviceID => {
            this.vAxes.push({
                exportName: '',
                instanceId: '',
                math: '',
                color: '',
                valueName: '',
                valueType: '',
                valueAlias: deviceID,
                conversions: [{
                    from: '1',
                    to: '1',
                    color: '#ff0000',
                    alias: 'auffaellig'
                }, {
                    from: '0',
                    to: '0',
                    color: '#008000',
                    alias: 'normal'
                }]
            });
        });
    }

    // I have to use arrow function, so that `this` is accesible from within the timeline apex chart code
    onClick = (_: any, config: any) => {
        // console.log(chartContext, config);
        const selection = config.w.config.series[config.seriesIndex].data[config.dataPointIndex];
        const deviceID = selection['x'];
        const timestamp = selection['y'];
        const startTime = new Date(timestamp[0]);
        const endTime = new Date(timestamp[1]);
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '1000px';
        dialogConfig.minHeight = '500px';
        dialogConfig.data = {
            anomaly: this.findAnomaly(deviceID, startTime, endTime)
        };
        const editDialogRef = this.dialog.open(AnomalyReconstructionComponent, dialogConfig);
    };

    private findAnomaly(deviceID: string, selectedStartTime: Date, selectedEndTime: Date) {
        return this.anomalies?.[deviceID][0];
        /* Find the corresponding anomaly based on device id and start/end time */
        (this.anomalies?.[deviceID] || []).forEach(anomaly => {
            const startTime = new Date(anomaly.start_time);
            const endTime = new Date(anomaly.end_time);
            if(selectedStartTime === startTime && selectedEndTime === endTime) {
                return anomaly;
            }
            return;
        });
    }
}
