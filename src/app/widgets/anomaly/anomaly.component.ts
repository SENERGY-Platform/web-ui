import { Component, Input, OnInit } from '@angular/core';
import { Subscription, concatMap, Observable, map, of } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { AnomalyResultModel } from './shared/anomaly.model';
import { AnomalyService } from './shared/anomaly.service';

@Component({
    selector: 'senergy-anomaly-detection',
    templateUrl: './anomaly.component.html',
    styleUrls: ['./anomaly.component.css']
})
export class AnomalyComponent implements OnInit {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    anomaly: AnomalyResultModel = {} as AnomalyResultModel;

  @Input() dashboardId = '';
  @Input() widget: WidgetModel = {} as WidgetModel;
  @Input() zoom = false;
  @Input() userHasDeleteAuthorization = false;
  @Input() userHasUpdatePropertiesAuthorization = false;
  @Input() userHasUpdateNameAuthorization = false;

  constructor(
    private dashboardService: DashboardService,
    private anomalyService: AnomalyService
  ) {}

  ngOnInit(): void {
      this.update();
  }

  private update() {
      this.destroy = this.dashboardService.initWidgetObservable.pipe(
          concatMap((event: string) => {
              if (event === 'reloadAll' || event === this.widget.id) {
                  this.refreshing = true;
                  return this.loadAnomaly();
              }
              return of();
          })).subscribe({
          next: (_) => {
              this.ready = true;
              this.refreshing = false;
          },
          error: (_) => {
              this.ready = true;
              this.refreshing = false;
          }
      });
  }

  edit() {
      this.anomalyService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
  }

  loadAnomaly(): Observable<any> {
      return this.anomalyService.getAnomaly(this.widget).pipe(
          map((anomaly) => {
              if(anomaly != null) {
                  this.anomaly = anomaly;
              }
          })
      );
  }
}
