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
import { BehaviorSubject, forkJoin, Observable, Subject, Subscriber } from 'rxjs';
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
    private sections: SidenavSectionModel[] = []
    private sectionsSubject: Subject<SidenavSectionModel[]> = new Subject()

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

    checkAuthorizationForSections(checks: any): SidenavPageModel[] {
        var sectionsWithAuthorization: SidenavPageModel[] = []

        checks.forEach((check: any) => {
            var checkFunction = check[0]
            var section = check[1]
            var thisArg = check[2]

            if(checkFunction.call(thisArg)) {
                sectionsWithAuthorization.push(section)
            }
        });

        return sectionsWithAuthorization
    }

    setupAnalyticsSection(): SidenavSectionModel {
        var sections = this.checkAuthorizationForSections([
            [this.operatorRepoService.userHasReadAuthorization, new SidenavPageModel('Operators', 'link', 'code', '/data/operator-repo'), this.operatorRepoService],
            [this.flowRepoService.userHasCreateAuthorization, new SidenavPageModel('Designer', 'link', 'create', '/data/designer'), this.flowRepoService],
            [this.flowRepoService.userHasReadAuthorization, new SidenavPageModel('Flows', 'link', 'insights', '/data/flow-repo'), this.flowRepoService],
            [this.pipelineService.userHasReadAuthorization, new SidenavPageModel('Pipelines', 'link', 'analytics', '/data/pipelines'), this.pipelineService]
        ])
        var analyticsSection = new SidenavSectionModel('Analytics', 'toggle', 'bar_chart', '/data', sections)
        return analyticsSection     
    }

    setupDevSection(): SidenavSectionModel {
        var sections: SidenavPageModel[] = []
        if(this.swaggerService.userHasReadAuthorization()) {
            sections.push(new SidenavPageModel('API', 'link', 'api', '/dev/api'))
        }

        var devSection = new SidenavSectionModel('Developer', 'toggle', 'engineering', '/dev', sections)
        return devSection
    }

    setupAdminSection(): SidenavSectionModel {
        var sections: SidenavPageModel[] = []
        if(this.authService.userIsAdmin()) {
            sections = [
                new SidenavPageModel('Authorization', 'link', 'security', '/admin/authorization'),
                new SidenavPageModel('Timescale Rules', 'link', 'rule', '/admin/timescale-rules'),
                new SidenavPageModel('Budgets', 'link', 'savings', '/admin/budgets'),
            ]
        } 

        var adminSection = new SidenavSectionModel('Admin', 'toggle', 'admin_panel_settings', '/admin', sections)
        return adminSection
    }

    setupProcessSection(): SidenavSectionModel {
        var checks: any = [
            [this.processRepoService.userHasCreateAuthorization, new SidenavPageModel('Designer', 'link', 'create', '/processes/designer'), this.processRepoService],
            [this.processRepoService.userHasReadAuthorization, new SidenavPageModel('Repository', 'link', 'storage', '/processes/repository'), this.processRepoService],
            [this.processDeploymentService.userHasReadAuthorization, new SidenavPageModel('Deployments', 'link', 'publish', '/processes/deployments'), this.processDeploymentService],
            [this.processMonitorService.userHasReadAuthorization, new SidenavPageModel('Monitor', 'link', 'search', '/processes/monitor'), this.processMonitorService]
        ]

        if(environment.processIoUrl) {
            checks.push([this.processIOService.userHasReadAuthorization, new SidenavPageModel('IO', 'link', 'table_chart', '/processes/io'), this.processIOService])
        }

        var sections = this.checkAuthorizationForSections(checks)
        var processSection = new SidenavSectionModel('Processes', 'toggle', 'timeline', '/processes', sections)
        return processSection
    }

    setupSmartServiceSection(): SidenavSectionModel {
        var sections = this.checkAuthorizationForSections([
            [this.smartServiceDesignService.userHasReadAuthorization, new SidenavPageModel('Designs', 'link', 'create', '/smart-services/designs'), this.smartServiceDesignService],
            [this.smartServiceDesignService.userHasReadAuthorization, new SidenavPageModel('Releases', 'link', 'storage', '/smart-services/releases'), this.smartServiceDesignService]
        ])

        var smartServiceSection = new SidenavSectionModel('Smart Services', 'toggle', 'design_services', '/smart-services', sections)
        return smartServiceSection
    }
    
    setupExportSection(): SidenavSectionModel {
        var sections = this.checkAuthorizationForSections([
            [this.exportService.userHasReadAuthorization, new SidenavPageModel('Database', 'link', 'table_chart', '/exports/db'), this.exportService],
            [this.exportBrokerService.userHasReadAuthorization, new SidenavPageModel('Broker', 'link', 'call_split', '/exports/broker'), this.exportBrokerService]
        ])
        var exportSection = new SidenavSectionModel('Exports', 'toggle', 'west', '/exports', sections)
        return exportSection
    }

    setupImportSection(): SidenavSectionModel {
        var sections = this.checkAuthorizationForSections([
            [this.importTypeService.userHasReadAuthorization, new SidenavPageModel('Types', 'link', 'api', '/imports/types/list'), this.importTypeService],
            [this.importInstanceSercice.userHasReadAuthorization, new SidenavPageModel('Instances', 'link', 'double_arrow', '/imports/instances'), this.importInstanceSercice]
        ])
        var importSection = new SidenavSectionModel('Imports', 'toggle', 'east', '/imports', sections)
        return importSection
    }

    
    setupWaitingRoom(): SidenavPageModel {
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

        return waitingRoom
    }

    setupDeviceManagementSection(): SidenavSectionModel {
        var sections = this.checkAuthorizationForSections([
            [this.networkService.userHasReadAuthorization, new SidenavPageModel('Networks', 'link', 'device_hub', '/devices/networks'), this.networkService],
            [this.deviceInstanceService.userHasReadAuthorization, new SidenavPageModel('Devices', 'link', 'sensors', '/devices/deviceinstances'), this.deviceInstanceService],
            [this.deviceGroupService.userHasReadAuthorization, new SidenavPageModel('Groups', 'link', 'group_work', '/devices/devicegroups'), this.deviceGroupService],
            [this.locationService.userHasReadAuthorization, new SidenavPageModel('Locations', 'link', 'place', '/devices/locations'), this.locationService]
        ])

        if(this.waitingRoomService.userHasReadAuthorization()) {
            sections.push(this.setupWaitingRoom())
        }
        var deviceSection = new SidenavSectionModel('Device Management', 'toggle', 'devices', '/devices', sections)
        return deviceSection
    }
    
    setupMetadataSection(): SidenavSectionModel {
        var sections = this.checkAuthorizationForSections([
            [this.deviceClassService.userHasReadAuthorization, new SidenavPageModel('Device Classes', 'link', 'devices_other', '/metadata/deviceclasses'), this.deviceClassService],
            [this.functionService.userHasReadAuthorization, new SidenavPageModel('Functions', 'link', 'functions', '/metadata/functions'), this.functionService],
            [this.aspectsService.userHasReadAuthorization, new SidenavPageModel('Aspects', 'link', 'wallpaper', '/metadata/aspects'), this.aspectsService],
            [this.conceptsService.userHasReadAuthorization, new SidenavPageModel('Concepts', 'link', 'category', '/metadata/concepts'), this.conceptsService],
            [this.characteristicsService.userHasReadAuthorization, new SidenavPageModel('Characteristics', 'link', 'scatter_plot', '/metadata/characteristics'), this.characteristicsService],
            [this.deviceTypeService.userHasReadAuthorization, new SidenavPageModel('Device Types', 'link', 'important_devices', '/metadata/devicetypesoverview'), this.deviceTypeService]
        ])
    
        var metadataSection = new SidenavSectionModel('Metadata', 'toggle', 'web_asset', '/metadata', sections)
        return metadataSection  
    }

    loadSections(): SidenavSectionModel[] {
            var sections: SidenavSectionModel[] = [
                this.setupAnalyticsSection(),
                this.setupDevSection(),
                this.setupAdminSection(),
                this.setupProcessSection(),
                this.setupExportSection(),
                this.setupImportSection(),
                this.setupDeviceManagementSection(),
                this.setupMetadataSection(),
                this.setupSmartServiceSection()
            ];

            if(this.dashboardService.userHasReadAuthorization()) {
                sections.push(new SidenavSectionModel('Dashboard', 'link', 'dashboard', '/dashboard', []))
            }
            
            // Just keep Main sections that have at least one subsection
            sections = sections.filter(section => section.pages.length > 0 || section.name == "Dashboard")

            var sortedSectionTitles = ["Dashboard", "Smart Services", "Processes", "Exports", "Analytics", "Device Management", "Imports", "Metadata", "Admin", "Developer"]
            sections.sort(function(section1, section2) {
                return sortedSectionTitles.indexOf(section1.name) - sortedSectionTitles.indexOf(section2.name)
            })

            this.sections = sections
            return sections
    }
}
