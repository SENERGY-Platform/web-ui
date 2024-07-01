import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { GoogleChartComponent } from 'ng2-google-charts';
import { map } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ChartsModel } from '../charts/shared/charts.model';
import { ConsumptionProfileProperties, ConsumptionProfilePropertiesModel, ConsumptionProfileResponse } from './shared/consumption-profile.model';
import { ConsumptionProfileService } from './shared/consumption-profile.service';

@Component({
    selector: 'senergy-consumption-profile-widget',
    templateUrl: './consumption-profile.component.html',
    styleUrls: ['./consumption-profile.component.css']
})
export class ConsumptionProfileComponent implements OnInit {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild('content', {static: false}) contentBox!: ElementRef;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    chartExportData: any;
    configured = false;
    error = false;
    widgetProperties!: ConsumptionProfileProperties;
    refreshing = false;
    ready = false;

    // Use a setter for the chart which will get called when then ngif from ready evaluates to true
    // This is needed so the element is not undefined when called later to draw
    private chartExport!: GoogleChartComponent;
    @ViewChild('chartExport', {static: false}) set content(content: GoogleChartComponent) {
        if(content) { // initially setter gets called with undefined
            this.chartExport = content;
        }
    }

    constructor(private consumptionService: ConsumptionProfileService) {

    }

    ngOnInit(): void {
        if(!this.widget.properties.consumptionProfile) {
            this.configured = false;
            return;
        } else {
            this.configured = true;
            this.widgetProperties = this.widget.properties.consumptionProfile || {};
        }

        this.consumptionService.getLatestConsumptionProfileOutput(this.widgetProperties.exportID).pipe(
            map((data) => {
                this.setupChartData(data);
            })
        ).subscribe({
            next: () => {
                this.ready = true;
            },
            error: (err) => {
                console.log(err);
                this.ready = true;
                this.error = true;
            }
        });
    }

    setupChartData(data: ConsumptionProfileResponse) {
        const dataTable: any = [["time", "value"]];
        data.last_consumptions.forEach(row => {
            const ts = row[0];
            const value = row[1];
            dataTable.push([ts, value]);
        });
        this.chartExportData = new ChartsModel('LineChart', dataTable, {
            legend: {position: 'none'},
            vAxis: {
                title: 'Consumption'
            }
        });
        this.chartExport?.draw();
    }

    edit() {
        this.consumptionService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
