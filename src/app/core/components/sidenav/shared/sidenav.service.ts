/*
 * Copyright 2020 InfAI (CC SES)
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

import {EventEmitter, Injectable, OnDestroy, Output} from '@angular/core';

import {SidenavSectionModel} from './sidenav-section.model';
import {SidenavPageModel} from './sidenav-page.model';
import {WaitingRoomService} from '../../../../modules/devices/waiting-room/shared/waiting-room.service';
import {debounceTime} from 'rxjs/operators';
import {WaitingRoomEventTypeAuthOk} from '../../../../modules/devices/waiting-room/shared/waiting-room.model';
import {environment} from '../../../../../environments/environment';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { SwaggerService } from 'src/app/modules/api-doc/shared/swagger/swagger.service';
import { forkJoin, Observable } from 'rxjs';
import { FlowRepoService } from 'src/app/modules/data/flow-repo/shared/flow-repo.service';
import { OperatorRepoService } from 'src/app/modules/data/operator-repo/shared/operator-repo.service';
import { PipelineRegistryService } from 'src/app/modules/data/pipeline-registry/shared/pipeline-registry.service';
import { DesignerHelperService } from 'src/app/modules/processes/designer/shared/designer-helper.service';
import { ProcessRepoService } from 'src/app/modules/processes/process-repo/shared/process-repo.service';
import { DeploymentsService } from 'src/app/modules/processes/deployments/shared/deployments.service';
import { MonitorService } from 'src/app/modules/processes/monitor/shared/monitor.service';
import { SmartServiceDesignsService } from 'src/app/modules/smart-services/designs/shared/designs.service';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { BrokerExportService } from 'src/app/modules/exports/shared/broker-export.service';
import { ImportTypesService } from 'src/app/modules/imports/import-types/shared/import-types.service';
import { ImportInstancesService } from 'src/app/modules/imports/import-instances/shared/import-instances.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { AspectsService } from 'src/app/modules/metadata/aspects/shared/aspects.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { CharacteristicsService } from 'src/app/modules/metadata/characteristics/shared/characteristics.service';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceClassesService } from 'src/app/modules/metadata/device-classes/shared/device-classes.service';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { NetworksService } from 'src/app/modules/devices/networks/shared/networks.service';
import { ProcessIoService } from 'src/app/modules/processes/process-io/shared/process-io.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';

@Injectable({
    providedIn: 'root',
})
export class SidenavService implements OnDestroy {
    @Output() toggleChanged: EventEmitter<boolean> = new EventEmitter();
    @Output() sectionChanged: EventEmitter<string> = new EventEmitter();

    private isToggled = false;
    private section = '';
    private waitingRoomEventCloser?: () => void;

    constructor(
        private waitingRoomService: WaitingRoomService, 
        private authService: AuthorizationService,
        private swaggerService: SwaggerService,
        private flowRepoService: FlowRepoService,
        private operatorRepoService: OperatorRepoService,
        private pipelineService: PipelineRegistryService,
        private processDesignerService: DesignerHelperService,
        private processRepoService: ProcessRepoService,
        private processDeploymentService: DeploymentsService,
        private processMonitorService: MonitorService,
        private smartServiceDesignService: SmartServiceDesignsService,
        private exportService: ExportService,
        private exportBrokerService: BrokerExportService,
        private importTypeService: ImportTypesService,
        private importInstanceSercice: ImportInstancesService,
        private functionService: FunctionsService,
        private aspectsService: AspectsService,
        private conceptsService: ConceptsService,
        private characteristicsService: CharacteristicsService,
        private deviceTypeService: DeviceTypeService,
        private deviceClassService: DeviceClassesService,
        private locationService: LocationsService,
        private deviceGroupService: DeviceGroupsService,
        private deviceInstanceService: DeviceInstancesService,
        private networkService: NetworksService,
        private processIOService: ProcessIoService,
        private dashboardService: DashboardService
    ) {}

    ngOnDestroy() {
        if (this.waitingRoomEventCloser) {
            this.waitingRoomEventCloser();
        }
    }

    toggle(sidenavOpen: boolean): void {
        this.isToggled = sidenavOpen;
        this.toggleChanged.emit(this.isToggled);
    }

    reset(): void {
        this.sectionChanged.emit(this.section);
    }

    checkPermissionForSidenavPage(checkFunction: any, sidenavPageModel: any, thisArg: any) {
        var obs: Observable<SidenavPageModel> = new Observable(obs => {
            checkFunction.call(thisArg).subscribe((hasAuth: boolean) => {
                if(hasAuth) {
                    obs.next(sidenavPageModel)
                } else {
                    obs.next(undefined)
                }
                obs.complete()
            })
        })
        return obs;
    }

    setupAnalyticsSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            var allObs = []
            allObs.push(this.checkPermissionForSidenavPage(this.operatorRepoService.userHasReadAuthorization, new SidenavPageModel('Operators', 'link', 'code', '/data/operator-repo'), this.operatorRepoService))
            allObs.push(this.checkPermissionForSidenavPage(this.flowRepoService.userHasCreateAuthorization, new SidenavPageModel('Designer', 'link', 'create', '/data/designer'), this.flowRepoService))
            allObs.push(this.checkPermissionForSidenavPage(this.flowRepoService.userHasReadAuthorization, new SidenavPageModel('Flows', 'link', 'insights', '/data/flow-repo'), this.flowRepoService))
            allObs.push(this.checkPermissionForSidenavPage(this.pipelineService.userHasReadAuthorization, new SidenavPageModel('Pipelines', 'link', 'analytics', '/data/pipelines'), this.pipelineService))

            forkJoin(allObs).subscribe((sections) => {
                sections = sections.filter(section => !!section)
                var analyticsSection = new SidenavSectionModel('Analytics', 'toggle', 'bar_chart', '/data', sections)
                obs.next(analyticsSection)
                obs.complete()
            })
        })
    }

    setupDevSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            var allObs = []

            var swaggerObs: Observable<SidenavPageModel> = new Observable(obs => {
                this.swaggerService.userHasReadAuthorization().subscribe((hasPerm: boolean) => {
                    if(hasPerm) {
                        var section = new SidenavPageModel('API', 'link', 'api', '/dev/api')
                        obs.next(section)
                    } else {
                        obs.next(undefined)
                    }
                    obs.complete()
                })
            })
            allObs.push(swaggerObs)
    
            forkJoin(allObs).subscribe((sections) => {
                sections = sections.filter(section => !!section)
                var devSection = new SidenavSectionModel('Developer', 'toggle', 'engineering', '/dev', sections)
                obs.next(devSection)
                obs.complete()
            })
        })
    }

    setupAdminSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            if(this.authService.userIsAdmin()) {
                var adminSection = new SidenavSectionModel('Admin', 'toggle', 'admin_panel_settings', '/admin', [
                        new SidenavPageModel('Authorization', 'link', 'security', '/admin/authorization'),
                        new SidenavPageModel('Timescale Rules', 'link', 'rule', '/admin/timescale-rules'),
                ])
                obs.next(adminSection)
            } else {
                obs.next(undefined)
            }
            obs.complete()
        })
        
    }

    setupProcessSection(): Observable<SidenavSectionModel> {
        var self = this;
        return new Observable(obs => {
            var allObs = []
            allObs.push(this.checkPermissionForSidenavPage(this.processRepoService.userHasCreateAuthorization, new SidenavPageModel('Designer', 'link', 'create', '/processes/designer'), this.processRepoService))
            allObs.push(this.checkPermissionForSidenavPage(this.processRepoService.userHasReadAuthorization, new SidenavPageModel('Repository', 'link', 'storage', '/processes/repository'), this.processRepoService))
            allObs.push(this.checkPermissionForSidenavPage(this.processDeploymentService.userHasReadAuthorization, new SidenavPageModel('Deployments', 'link', 'publish', '/processes/deployments'), this.processDeploymentService))
            allObs.push(this.checkPermissionForSidenavPage(this.processMonitorService.userHasReadAuthorization, new SidenavPageModel('Monitor', 'link', 'search', '/processes/monitor'), this.processMonitorService))
            if(environment.processIoUrl){
                allObs.push(this.checkPermissionForSidenavPage(this.processIOService.userHasReadAuthorization, new SidenavPageModel('IO', 'link', 'table_chart', '/processes/io'), this.processIOService))
            }

            forkJoin(allObs).subscribe((sections) => {
                sections = sections.filter(section => !!section)                
                var processSection = new SidenavSectionModel('Processes', 'toggle', 'timeline', '/processes', sections)
                obs.next(processSection)
                obs.complete()
            })
        })
    }

    setupSmartServiceSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            if(environment.smartServiceRepoUrl){
                var allObs = []
                allObs.push(this.checkPermissionForSidenavPage(this.smartServiceDesignService.userHasReadAuthorization, new SidenavPageModel('Designs', 'link', 'create', '/smart-services/designs'), this.smartServiceDesignService))
                allObs.push(this.checkPermissionForSidenavPage( this.smartServiceDesignService.userHasReadAuthorization, new SidenavPageModel('Releases', 'link', 'storage', '/smart-services/releases'), this.smartServiceDesignService))

                forkJoin(allObs).subscribe((sections) => {
                    sections = sections.filter(section => !!section)
                    var smartServiceSection = new SidenavSectionModel('Smart Services', 'toggle', 'design_services', '/smart-services', sections)
                    obs.next(smartServiceSection)
                    obs.complete()
                })    
            
            } else {
                obs.next(undefined)
                obs.complete()
            }
        })
    }
    
    setupExportSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
                var allObs = []
                allObs.push(this.checkPermissionForSidenavPage(this.exportService.userHasReadAuthorization, new SidenavPageModel('Database', 'link', 'table_chart', '/exports/db'), this.exportService))
                allObs.push(this.checkPermissionForSidenavPage(this.exportBrokerService.userHasReadAuthorization, new SidenavPageModel('Broker', 'link', 'call_split', '/exports/broker'), this.exportBrokerService))

                forkJoin(allObs).subscribe((sections) => {
                    sections = sections.filter(section => !!section)
                    var exportSection = new SidenavSectionModel('Exports', 'toggle', 'west', '/exports', sections)
                    obs.next(exportSection)
                    obs.complete()
                })    
            
        })
    }

    setupImportSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            var allObs = []
            allObs.push(this.checkPermissionForSidenavPage(this.importTypeService.userHasReadAuthorization, new SidenavPageModel('Types', 'link', 'api', '/imports/types/list'), this.importTypeService))
            allObs.push(this.checkPermissionForSidenavPage(this.importInstanceSercice.userHasReadAuthorization, new SidenavPageModel('Instances', 'link', 'double_arrow', '/imports/instances'), this.importInstanceSercice))

            forkJoin(allObs).subscribe((sections) => {
                sections = sections.filter(section => !!section)
                var exportSection = new SidenavSectionModel('Imports', 'toggle', 'east', '/imports', sections)
                obs.next(exportSection)
                obs.complete()
            })    
        })
    }

    
    setupWaitingRoom(): Observable<SidenavPageModel> {
        return new Observable(obs => {
            this.waitingRoomService.userHasReadAuthorization().subscribe(hasAuth => {
                if(hasAuth) {
                    const waitingRoom = new SidenavPageModel('Waiting Room', 'link', 'chair', '/devices/waiting-room', '');

                    const refreshWaitingRoom = () => {
                        this.waitingRoomService.searchDevices('', 1, 0, 'name', 'asc', false).subscribe((value) => {
                            if (value && value.total > 0) {
                                waitingRoom.badge = String(value.total);
                            }
                            if (value && value.total === 0) {
                                waitingRoom.badge = '';
                            }
                        });
                    };
            
                    this.waitingRoomService
                        .events(
                            (closer) => {
                                this.waitingRoomEventCloser = closer;
                            },
                            () => {
                                refreshWaitingRoom();
                            },
                        )
                        .pipe(debounceTime(1000))
                        .subscribe((msg) => {
                            if (msg.type === WaitingRoomEventTypeAuthOk || this.waitingRoomService.eventIsUpdate(msg)) {
                                refreshWaitingRoom();
                            }
                        });

                    obs.next(waitingRoom)
                    obs.complete()
                } else {
                    obs.next(undefined)
                    obs.complete()
                }
            })
        })
    }

    setupDeviceManagementSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            var allObs = []

            allObs.push(this.checkPermissionForSidenavPage(this.networkService.userHasReadAuthorization, new SidenavPageModel('Networks', 'link', 'device_hub', '/devices/networks'), this.networkService))
            allObs.push(this.setupWaitingRoom())
            allObs.push(this.checkPermissionForSidenavPage(this.deviceInstanceService.userHasReadAuthorization, new SidenavPageModel('Devices', 'link', 'sensors', '/devices/deviceinstances'), this.deviceInstanceService))
            allObs.push(this.checkPermissionForSidenavPage(this.deviceGroupService.userHasReadAuthorization, new SidenavPageModel('Groups', 'link', 'group_work', '/devices/devicegroups'), this.deviceGroupService))
            allObs.push(this.checkPermissionForSidenavPage(this.locationService.userHasReadAuthorization, new SidenavPageModel('Locations', 'link', 'place', '/devices/locations'), this.locationService))

            forkJoin(allObs).subscribe((sections) => {
                    sections = sections.filter(section => !!section)
                    var exportSection = new SidenavSectionModel('Device Management', 'toggle', 'devices', '/devices', sections)
                    obs.next(exportSection)
                    obs.complete()
            }) 
            
        })
    }

    setupDashboard(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            this.dashboardService.userHasReadAuthorization().subscribe(hasAuth => {
                if(hasAuth) {
                    var dashboardSection = new SidenavSectionModel('Dashboard', 'link', 'dashboard', '/dashboard', [])
                    obs.next(dashboardSection)
                    obs.complete()
                } else {
                    obs.next(undefined)
                    obs.complete()
                }
            })
        })
    }
    

    setupMetadataSection(): Observable<SidenavSectionModel> {
        return new Observable(obs => {
            var allObs: Observable<SidenavPageModel>[] = []
            allObs.push(this.checkPermissionForSidenavPage(this.deviceClassService.userHasReadAuthorization, new SidenavPageModel('Device Classes', 'link', 'devices_other', '/metadata/deviceclasses'), this.deviceClassService))
            allObs.push(this.checkPermissionForSidenavPage(this.functionService.userHasReadAuthorization, new SidenavPageModel('Functions', 'link', 'functions', '/metadata/functions'), this.functionService))
            allObs.push(this.checkPermissionForSidenavPage(this.aspectsService.userHasReadAuthorization, new SidenavPageModel('Aspects', 'link', 'wallpaper', '/metadata/aspects'), this.aspectsService))
            allObs.push(this.checkPermissionForSidenavPage(this.conceptsService.userHasReadAuthorization, new SidenavPageModel('Concepts', 'link', 'category', '/metadata/concepts'), this.conceptsService))
            allObs.push(this.checkPermissionForSidenavPage(this.characteristicsService.userHasReadAuthorization, new SidenavPageModel('Characteristics', 'link', 'scatter_plot', '/metadata/characteristics'), this.characteristicsService))
            allObs.push(this.checkPermissionForSidenavPage(this.deviceTypeService.userHasReadAuthorization, new SidenavPageModel('Device Types', 'link', 'important_devices', '/metadata/devicetypesoverview'), this.deviceTypeService))

            forkJoin(allObs).subscribe((sections) => {
                sections = sections.filter(section => !!section)
                var exportSection = new SidenavSectionModel('Metadata', 'toggle', 'web_asset', '/metadata', sections)
                obs.next(exportSection)
                obs.complete()
            })
        })
    }

    getSections(): Observable<SidenavSectionModel[]> {
        return new Observable(obs => {
            var allObs: Observable<SidenavSectionModel>[] = []
            var sections: SidenavSectionModel[] = [];

            var dashbaordObs: Observable<SidenavSectionModel> = this.setupDashboard() 
            allObs.push(dashbaordObs)

            var analyticsObs: Observable<SidenavSectionModel> = this.setupAnalyticsSection()
            allObs.push(analyticsObs)
            
            var devObs: Observable<SidenavSectionModel> = this.setupDevSection()
            allObs.push(devObs)

            var adminObs: Observable<SidenavSectionModel> = this.setupAdminSection()
            allObs.push(adminObs)

            var processObs: Observable<SidenavSectionModel> = this.setupProcessSection()
            allObs.push(processObs)

            var exportObs: Observable<SidenavSectionModel> = this.setupExportSection()
            allObs.push(exportObs)

            var importObs: Observable<SidenavSectionModel> = this.setupImportSection()
            allObs.push(importObs)

            var devicesObs: Observable<SidenavSectionModel> = this.setupDeviceManagementSection()
            allObs.push(devicesObs)

            var metaObs: Observable<SidenavSectionModel> = this.setupMetadataSection()
            allObs.push(metaObs)
            
            var smartObs: Observable<SidenavSectionModel> = this.setupSmartServiceSection()
            allObs.push(smartObs)
            
            forkJoin(allObs).subscribe(sections2 => {
                sections2 = sections2.filter(section => !!section)

                // Just keep Main sections that have at least one subsection
                sections2 = sections2.filter(section => section.pages.length > 0 || section.name == "Dashboard")

                sections = sections.concat(sections2)
                var sortedSectionTitles = ["Dashboard", "Smart Services", "Processes", "Exports", "Analytics", "Device Management", "Imports", "Metadata", "Admin", "Developer"]
                sections.sort(function(section1, section2) {
                    return sortedSectionTitles.indexOf(section1.name) - sortedSectionTitles.indexOf(section2.name)
                })

                obs.next(sections)
                obs.complete()

            })
        })
    }
}
