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


import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, Subscription, concatMap, forkJoin, map, of } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceTypeFunctionModel, DeviceTypeDeviceClassModel, DeviceTypeAspectNodeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { DeviceClassesService } from 'src/app/modules/metadata/device-classes/shared/device-classes.service';
import { draw, FloorplanWidgetCapabilityModel, FloorplanWidgetPropertiesModel, image, migrateColoring } from '../shared/floorplan.model';
import { materialIconNames } from 'src/app/core/model/icon.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';

@Component({
  selector: 'senergy-floorplan-edit-dialog',
  templateUrl: './floorplan-edit-dialog.component.html',
  styleUrl: './floorplan-edit-dialog.component.css'
})
export class FloorplanEditDialogComponent implements OnInit, AfterViewInit {
  dashboardId = '';
  widgetId = '';
  userHasUpdateNameAuthorization = false;
  userHasUpdatePropertiesAuthorization = false;
  ready = false;
  widget: WidgetModel | undefined;
  deviceGroups: DeviceGroupModel[] = [];
  deviceGroupsTotal = 0;
  deviceGroupLoadingSubscription: Subscription | undefined;
  aspects: DeviceTypeAspectNodeModel[] = [];
  functions: DeviceTypeFunctionModel[] = [];
  deviceClasses: DeviceTypeDeviceClassModel[] = [];
  placing: number | undefined;
  drawShift = { centerShiftX: NaN, centerShiftY: NaN, ratio: NaN };
  step: number | undefined;
  materialIconNames = materialIconNames;
  functionIdToType = new Map<string, string>();

  form = new FormGroup({
    image: new FormControl<string | null>(null),
    placements: new FormArray([].map(this.newPlacement)),
    dotSize: new FormControl<number>(25, { validators: [Validators.required, Validators.min(1)] }),
  });
  name = new FormControl<string>('', Validators.required);

  @ViewChild('fileInput', { static: true }) public fileInput!: ElementRef;
  @ViewChild('canvas', { static: false }) canvas: ElementRef<HTMLCanvasElement> | undefined;


  constructor(
    private dialogRef: MatDialogRef<FloorplanEditDialogComponent>,
    private dashboardService: DashboardService,
    private errorHandlerService: ErrorHandlerService,
    private fb: NonNullableFormBuilder,
    private deviceGroupsService: DeviceGroupsService,
    private functionService: FunctionsService,
    private deviceClassService: DeviceClassesService,
    private conceptsService: ConceptsService,
    private cd: ChangeDetectorRef,
    private el: ElementRef,
    @Inject(MAT_DIALOG_DATA) data: {
      dashboardId: string;
      widgetId: string;
      userHasUpdateNameAuthorization: boolean;
      userHasUpdatePropertiesAuthorization: boolean;
    },
  ) {
    this.dashboardId = data.dashboardId;
    this.widgetId = data.widgetId;
    this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
    this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
  }

  ngOnInit(): void {
    const obs: Observable<unknown>[] = [];
    obs.push(
      this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(concatMap(w => {
        this.widget = w;
        let r = of(null);
        if (w.properties.floorplan !== undefined) {
          migrateColoring(w.properties);
          this.form.patchValue(w.properties.floorplan);
          w.properties.floorplan.placements.forEach(p => {
            const placement = this.newPlacement();
            placement.patchValue(p);
            this.form.controls.placements.push(placement);
            p.coloring.forEach(c => {
              ((this.form.controls.placements as FormArray).at(this.form.controls.placements.length - 1) as any).controls.coloring.push(this.newColoring(c));
            });
          });
          const dgIds = w.properties.floorplan.placements.map(x => x.deviceGroupId);
          if (dgIds !== undefined && dgIds.length > 0) {
            r = this.deviceGroupsService.getDeviceGroupListByIds(dgIds.filter(x => x !== null) as string[], true).pipe(
              map(dg => {
                dg.forEach(d => this.filterCriteria(d));
                this.deviceGroups = [...this.deviceGroups, ...dg.filter(d => this.deviceGroups.find(d2 => d.id === d2.id) === undefined)];
                return null;
              }));
          }
        }
        this.name.setValue(w.name);
        return r;
      })));
    obs.push(this.deviceGroupsService.getDeviceGroups('', 30, 0, 'name', 'asc', true).pipe(
      map(dg => {
        this.deviceGroupsTotal = dg.total;
        dg.result.forEach(d => this.filterCriteria(d));
        return dg.result;
      }),
      map(dg => this.deviceGroups = [...this.deviceGroups, ...dg.filter(d => this.deviceGroups.find(d2 => d.id === d2.id) === undefined)])));

    obs.push(this.functionService.getFunctions('', 9999, 0, 'name', 'asc').pipe(map(f => this.functions = f.result)));
    obs.push(this.deviceGroupsService.getAspectListByIds(undefined).pipe(map(a => this.aspects = a)));
    obs.push(this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').pipe(map(c => this.deviceClasses = c.result)));

    forkJoin(obs).subscribe(_ => {
      this.ready = true;
      this.form.controls.image.valueChanges.subscribe(() => this.draw());
      for (let i = 0; i < 5; i++) {
        setTimeout(() => { // needs to draw ready=true first
          this.draw();
        }, i * 100);
      }
    });
  }

  resizeTimeout: any;
  ngAfterViewInit(): void {
    // use this hook, to get the resize sizes from the correct widget
    const ro = new ResizeObserver((_ => {
      // debouncing redraws due to many resize calls
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.draw();
        this.cd.detectChanges();
      }, 30);
    }));
    ro.observe(this.el.nativeElement);
  }

  draw() {
    if (this.canvas !== undefined) {
      this.drawShift = draw(this.canvas.nativeElement, { floorplan: this.form.getRawValue() } as FloorplanWidgetPropertiesModel, this.form.value.placements?.map((_2, i) => {
        return { text: '' + i };
      }));
    } else {
      setTimeout(() => this.draw(), 100);
    }
  }
  close(): void {
    this.dialogRef.close();
  }

  updateName(): Observable<DashboardResponseMessageModel> {
    return this.dashboardService.updateWidgetName(this.dashboardId, this.widgetId, this.name.value);
  }

  updateProperties(): Observable<DashboardResponseMessageModel> {
    this.sortAllColors();
    return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widgetId, [], { floorplan: this.form.getRawValue() });
  }

  save(): void {
    const obs = [];
    if (this.userHasUpdateNameAuthorization) {
      obs.push(this.updateName());
    }
    if (this.userHasUpdatePropertiesAuthorization) {
      obs.push(this.updateProperties());
    }

    forkJoin(obs).subscribe(responses => {
      const errorOccured = responses.find((response) => response.message !== 'OK');
      if (!errorOccured) {
        if (this.widget) {
          this.widget.name = this.name.value || '';
          this.widget.properties.floorplan = this.form.getRawValue() as any;
        }
        this.dialogRef.close(this.widget);
      }
    });
  }

  public onFileSelected(file: File | null) {
    if (file === null || !file.type.startsWith('image/')) {
      this.errorHandlerService.showErrorInSnackBar('Please select an image');
      return;
    }
    if (file.size > 256 * 1024) {
      this.errorHandlerService.showErrorInSnackBar('Please select a smaller image (max. 256KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.form.patchValue({ image: reader.result as string });
      this.draw();
      for (let i = 0; i < 5; i++) {
        setTimeout(() => { // needs to draw ready=true first
          this.draw();
        }, i * 100);
      }
    };
    try {
      reader.readAsDataURL(file);
    } catch (_) {
      console.error('fileInput undefined: Could not read file');
    }
  }

  // Handler for file input change
  onFileChange(event: any): void {
    const file = event.target.files[0] as File | null;
    this.onFileSelected(file);
  }

  // Handler for file drop
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0] as File | null;
    this.onFileSelected(file);
  }

  // Prevent default dragover behavior
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  // Method to remove the uploaded image
  removeImage(): void {
    this.form.patchValue({ image: undefined });
  }

  addNewPlacement(): void {
    this.form.controls.placements.push(this.newPlacement());
    this.form.controls.placements.updateValueAndValidity();
  }

  newPlacement(value?: FloorplanWidgetCapabilityModel): FormGroup {
    const fg = this.fb.group({
      criteria: new FormControl<DeviceGroupCriteriaModel | null>(null),
      deviceGroupId: new FormControl<string>(''),
      alias: new FormControl<string>(''),
      position: new FormGroup({
        x: new FormControl<number>(0),
        y: new FormControl<number>(0),
      }),
      coloring: new FormArray([].map(this.newColoring)),
      icon: new FormControl<string>('circle'),
      valueLow: new FormControl<number | null>(null),
      valueHigh: new FormControl<number | null>(null),
      colorLow: new FormControl<string>('#808080'),
      colorHigh: new FormControl<string>('#808080'),
    });
    fg.controls.criteria.valueChanges.pipe(concatMap(c => {
      if (c?.function_id === undefined) {
        return of([]);
      }
      if (this.functionIdToType.has(c.function_id)) {
        return of([]);
      }
      return this.deviceGroupsService.getFunctionListByIds([c.function_id]).pipe(
        concatMap(functions => this.conceptsService.getConceptsWithCharacteristics({ ids: functions.map(f => f.concept_id) }).pipe(map(concepts => ({ concepts, functions })))),
        map((res) => res.functions.forEach(f => {
          const concept = res.concepts.result.find(conc => f.concept_id === conc.id);
          if (concept === undefined) {
            return;
          }
          const t = concept.characteristics.find(characteristic => characteristic.id === concept.base_characteristic_id)?.type;
          if (t === undefined) {
            return;
          }
          this.functionIdToType.set(f.id, t);
        })));
    })).subscribe();
    if (value !== undefined) {
      fg.patchValue(value);
    }
    return fg;
  }

  addNewColoring(arr: FormArray): void {
    let val = { value: 100000, color: '#000000', showValue: false, showValueWhenZoomed: false };
    if (arr.length > 0) {
      val = arr.at(arr.length - 1).getRawValue();
    }
    arr.push(this.newColoring(val));
  }

  newColoring(value?: {
    value: number|string;
    color: string;
    showValue: boolean;
    showValueWhenZoomed: boolean;
  }): FormGroup {
    const fg = this.fb.group({
      value: new FormControl<number|string>(0),
      color: new FormControl(''),
      showValue: new FormControl(false),
      showValueWhenZoomed: new FormControl(false),
    });
    if (value !== undefined) {
      fg.patchValue(value);
    }
    return fg;
  }

  sortAllColors() {
    this.form.controls.placements.controls.forEach(p => this.getColoringControls(p).controls.sort((a, b) => a.value.value - b.value.value));
  }

  copyPlacement(i: number) {
    this.placing = undefined;
    this.form.controls.placements.push(this.newPlacement(this.form.controls.placements.at(i).value));
    this.form.controls.placements.updateValueAndValidity();
    this.step = this.form.controls.placements.length - 1;
    (this.form.controls.placements.at(i).controls.coloring as FormArray).controls.forEach(c =>
      (this.form.controls.placements.at(this.step || 0).controls.coloring as FormArray).push(this.newColoring(c.getRawValue()))
    );
    this.cd.detectChanges();
  }

  removePlacement(i: number) {
    this.placing = undefined;
    this.form.controls.placements.controls.splice(i, 1);
    this.form.controls.placements.updateValueAndValidity();
    this.draw();
  }

  placePlacement(i: number) {
    this.placing = i;
  }

  placeSelected($event: MouseEvent) {
    if (this.placing === undefined) {
      return;
    }
    const img = image({ floorplan: this.form.getRawValue() } as FloorplanWidgetPropertiesModel);
    this.form.controls.placements.at(this.placing).patchValue({
      position: {
        x: ($event.offsetX - this.drawShift.centerShiftX) / (img.naturalWidth * this.drawShift.ratio),
        y: ($event.offsetY - this.drawShift.centerShiftY) / (img.naturalHeight * this.drawShift.ratio),
      }
    });
    this.placing = undefined;
    this.draw();
  }

  onSelectScroll(scroll: { end: number }) {
    // backup for onSelectScroll
    if (scroll.end / this.deviceGroups.length < 0.75 || this.deviceGroups.length === this.deviceGroupsTotal || this.deviceGroupLoadingSubscription?.closed === false) {
      return;
    }
    this.deviceGroupLoadingSubscription = this.deviceGroupsService.getDeviceGroups('', 100, this.deviceGroups.length, 'name', 'asc', true).subscribe(dg => {
      dg.result.forEach(d => this.filterCriteria(d));
      // dg.result can contain device groups, which are already loaded
      this.deviceGroups = [... this.deviceGroups, ...dg.result.filter(d => this.deviceGroups.find(d2 => d.id === d2.id) === undefined)];
    });
  }

  onSelectSearch(search: { term: string, items: any[] }) {
    if (this.deviceGroups.length === this.deviceGroupsTotal && this.deviceGroupLoadingSubscription?.closed !== false) {
      return;
    }
    this.deviceGroupLoadingSubscription = this.deviceGroupsService.getDeviceGroups(search.term, 100, 0, 'name', 'asc', true).subscribe(dg => {
      dg.result.forEach(d => this.filterCriteria(d));
      // dg.result can contain device groups, which are already loaded
      this.deviceGroups = [...this.deviceGroups, ...dg.result.filter(d => this.deviceGroups.find(d2 => d.id === d2.id) === undefined)];
    });
  }

  getDeviceGroup(deviceGroupId: string): DeviceGroupModel | undefined {
    return this.deviceGroups.find(d => d.id === deviceGroupId);
  }

  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string {
    if (criteria == null) {
      return '';
    }
    return (this.functions.find(f => f.id === criteria.function_id)?.display_name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
  }

  compareCriteria(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return a.function_id === b.function_id &&
      a.device_class_id === b.device_class_id &&
      a.aspect_id === b.aspect_id &&
      a.interaction === b.interaction;
  }

  colorSelected($event: string, control: AbstractControl<any, any>) {
    control.setValue($event);
  }

  getColoringControls(tab: FormGroup<any>): FormArray<FormGroup> {
    return tab.controls.coloring as FormArray;
  }

  private filterCriteria(d: DeviceGroupModel) {
    d.criteria?.forEach(c => c.interaction = '');
    d.criteria = d.criteria?.filter((v, i, a) => a.findIndex(v2 => this.compareCriteria(v, v2)) === i);
  }

  criteriaIsNumeric(tab: FormGroup): boolean {
    const t = this.functionIdToType.get(tab.controls.criteria.value.function_id);
    if (t === 'https://schema.org/Integer' || t === 'https://schema.org/Float') {
      return true;
    }
    return false;
  }
}
