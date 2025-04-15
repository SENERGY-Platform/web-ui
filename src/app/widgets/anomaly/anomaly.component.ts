import {
    AfterContentChecked, Component,
    Input,
    OnDestroy,
    OnInit
} from '@angular/core';
import moment from 'moment';
import { Subscription, concatMap, map, of, throwError } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { AnomaliesPerDevice, AnomalyResultModel } from './shared/anomaly.model';
import { AnomalyService } from './shared/anomaly.service';

@Component({
    selector: 'senergy-anomaly-detection',
    templateUrl: './anomaly.component.html',
    styleUrls: ['./anomaly.component.css']
})
export class AnomalyComponent implements OnInit,OnDestroy, AfterContentChecked {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    lastAnomaly?: AnomalyResultModel;
    anomalies: AnomaliesPerDevice = {};
    error = false;
    operatorIsInitPhase = false;
    initialPhaseMsg = '';
    showDebug = false;
    allDevices: string[] = [];
    widgetHeight = 0;
    widgetWidth = 0;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    configured = false;


    constructor(
        private dashboardService: DashboardService,
        private anomalyService: AnomalyService,
        private elementSizeService: ElementSizeService,
    ) {}

    ngAfterContentChecked(): void {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget?.id||'');
        this.widgetWidth = element.width;
        this.widgetHeight = element.height;
    }

    ngOnInit(): void {
        this.configured = this.widget.properties.anomalyDetection !== undefined;
        if(!this.configured) {
            return;
        }
        this.update();
        this.configured = this.widget.properties.anomalyDetection !== undefined;
        this.showDebug = this.widget.properties.anomalyDetection?.showDebug || false;
    }

    ngOnDestroy(): void {
        this.destroy.unsubscribe();
    }

    private createMockAnomalies(): AnomaliesPerDevice {
        // Mock Anomalies.
        const extreme1 = moment().subtract(8, 'minutes').toISOString();
        const curve1Start = moment().subtract(30, 'minutes').toISOString();
        const curve1End = moment().subtract(10, 'minutes').toISOString();
        const curve2Start = moment().subtract(20, 'minutes').toISOString();
        const curve2End = moment().subtract(5, 'minutes').toISOString();
        const curve3Start = moment().subtract(50, 'minutes').toISOString();
        const curve3End = moment().subtract(40, 'minutes').toISOString();
        const freq1 = moment().subtract(1, 'minutes').toISOString();

        return {
            'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e6': [{
                value: '350',
                type: 'curve',
                subType: '',
                timestamp: '2024-06-27T09:47:14.058Z',
                start_time: curve3Start,
                end_time: curve3End,
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: [
                    [new Date(curve3Start).getTime(), 260, 270],
                    [new Date(curve3End).getTime(), 250, 260],
                ]
            },
            {
                value: '0.7',
                type: 'curve',
                subType: '',
                timestamp: '2024-06-27T09:47:14.058Z',
                start_time: curve1Start,
                end_time: curve1End,
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: [
                    [new Date(curve1Start).getTime(), 260, 270],
                    [new Date(curve1End).getTime(), 240, 250],
                ],
            },
            ],
            'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5': [{
                value: '350',
                type: 'extreme_value',
                subType: '',
                timestamp: extreme1,
                start_time: '2024-06-27T12:30:14.058Z',
                end_time: '2024-06-26T12:50:14.058Z',
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: [],
                upper_bound: 500,
                lower_bound: 800
            },
            {
                value: '0.8',
                type: 'curve',
                subType: '',
                timestamp: '2024-06-27T09:47:14.058Z',
                start_time: curve3Start,
                end_time: curve3End,
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: [
                    [new Date(curve3Start).getTime(), 270, 280],
                    [new Date(curve3End).getTime(), 240, 250],
                ]
            },
            {
                value: '0.9',
                type: 'curve',
                subType: '',
                timestamp: '2024-06-27T09:47:14.058Z',
                start_time: curve1Start,
                end_time: curve1End,
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: [
                    [new Date(curve1Start).getTime(), 240, 250],
                    [new Date(curve1End).getTime(), 240, 250],
                ],

            },
            {
                value: '0.8',
                type: 'curve',
                subType: '',
                timestamp: '2024-06-27T09:47:14.058Z',
                start_time: curve2Start,
                end_time: curve2End,
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: [
                    [new Date(curve2Start).getTime(),240, 250],
                    [new Date(curve2End).getTime(), 240, 250],
                ]
            },
            {
                value: '10',
                type: 'freq',
                subType: '',
                timestamp: freq1,
                start_time: '2024-06-27T13:30:14.058Z',
                end_time: '2024-06-27T13:59:14.058Z',
                threshold: 0,
                mean: 0,
                initial_phase: '',
                device_id: 'urn:infai:ses:device:b06a0104-95ae-4d8d-8811-af4bcff455e5',
                original_reconstructed_curves: []
            }]
        };
    }

    private loadAnomalies(exportID: string) {
        const timeRangeConfig = this.widget.properties.anomalyDetection?.timeRangeConfig?.timeRange;
        if(timeRangeConfig == null || timeRangeConfig.level == null || timeRangeConfig.time == null) {
            return throwError(() => new Error('time range not configured'));
        }
        const lastTimeRange = timeRangeConfig?.time+timeRangeConfig?.level;
        return this.anomalyService.getAnomalyHistory(exportID, lastTimeRange).pipe(
            map((anomalies) => {
                this.anomalies = anomalies;
                // this.anomalies = this.createMockAnomalies(); Use this to simulate some anomalies in the UI`
                this.getAllDevices(this.anomalies);
            })
        );
    }

    private getAllDevices(anomalies: AnomaliesPerDevice) {
        this.allDevices = Object.keys(anomalies);
    }

    private loadLastAnomaly(exportID: string) {
        return this.anomalyService.getAnomaly(exportID).pipe(
            map(anomaly => {
                if(anomaly != null) {
                    this.lastAnomaly = anomaly;
                }
                return anomaly;
            })
        );
    }

    private checkForInit(anomaly: AnomalyResultModel) {
        if(anomaly.initial_phase !== '' && anomaly.initial_phase !== null) {
            this.operatorIsInitPhase = true;
            this.initialPhaseMsg = anomaly.initial_phase;
            return true;
        }
        return false;
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.pipe(
            // TODO refresh in child components
            concatMap((event: string) => {
                if(this.widget.properties.anomalyDetection?.export == null) {
                    return of(null);
                }
                if (event === 'reloadAll' || event === this.widget.id) {
                    this.refreshing = true;
                    const exportID = this.widget.properties.anomalyDetection?.export;
                    return this.loadLastAnomaly(exportID);
                }
                return of(null);
            }),
            map((lastAnomaly) => {
                if(lastAnomaly != null) {
                    return this.checkForInit(lastAnomaly);
                }
                return false;
            }),
            concatMap((isInInit) => {
                if(!isInInit) {
                    const exportID = this.widget.properties.anomalyDetection?.export;
                    if(exportID == null) {
                        return throwError(()=>new Error('Export id missing'));
                    }
                    return this.loadAnomalies(exportID);
                }
                return of(null);
            })
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                console.log(err);
                this.error = true;
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    edit() {
        this.anomalyService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
