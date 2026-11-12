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


import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogHeaderComponent } from '../../../core/components/dialog-header/dialog-header.component';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { Observable, Subscription, concatMap, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { criteriaAspectIds, DeviceTypeFunctionModel, DeviceTypeDeviceClassModel, DeviceTypeAspectNodeModel, DeviceTypeCharacteristicsModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import { DeviceClassesService } from 'src/app/modules/metadata/device-classes/shared/device-classes.service';
import {
  defaultVoidTogglePairs,
  draw,
  impliedControllingCriteria,
  FloorplanWidgetCapabilityModel,
  FloorplanWidgetPropertiesModel,
  fpCriteriaConnectionStatus,
  image,
  isControllingFunction,
  isNumericCharacteristic,
  isPlaced,
  migrateColoring,
  StateSourceContextModel,
} from '../shared/floorplan.model';
import { ZONE_CORNERS } from '../shared/floorplan-zone';
import { materialIconNames } from 'src/app/core/model/icon.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { WidgetSpinnerComponent } from '../../components/widget-spinner/widget-spinner.component';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatExpansionPanelContent } from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';
import { MtxSelect, MtxOption, MtxSelectLabelTemplate, MtxSelectOptionTemplate } from '@ng-matero/extensions/select';
import { ColorPickerDirective } from 'ngx-color-picker';
import { Map as OlMap, View } from 'ol';
import { useGeographic } from 'ol/proj';
import { MapComponent } from '../../../modules/devices/map/map.component';
import { basemapAttribution, basemapLayer, MapSection, moveIntoSection, renderSection } from '../shared/floorplan-map';
import { PhotonHit, photonMinQueryLength, PhotonService } from 'src/app/core/services/photon.service';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';

@Component({
    selector: 'senergy-floorplan-edit-dialog',
    templateUrl: './floorplan-edit-dialog.component.html',
    styleUrl: './floorplan-edit-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DialogHeaderComponent, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, WidgetSpinnerComponent, MatFormField, MatLabel, MatInput, FormsModule, ReactiveFormsModule, MatError, MatErrorMessagesDirective, MatCheckbox, MatIconButton, MatIcon, ImageCropperComponent, NgClass, MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatExpansionPanelContent, MatTooltip, MtxSelect, MtxOption, MatHint, MtxSelectLabelTemplate, MtxSelectOptionTemplate, ColorPickerDirective, MatDialogActions, MatButton, MapComponent, MatAutocomplete, MatAutocompleteTrigger, MatOption]
})
export class FloorplanEditDialogComponent implements OnInit, AfterViewInit {
  private dialogRef = inject<MatDialogRef<FloorplanEditDialogComponent>>(MatDialogRef);
  private dashboardService = inject(DashboardService);
  private errorHandlerService = inject(ErrorHandlerService);
  private fb = inject(NonNullableFormBuilder);
  private deviceGroupsService = inject(DeviceGroupsService);
  private functionService = inject(FunctionsService);
  private deviceClassService = inject(DeviceClassesService);
  private conceptsService = inject(ConceptsService);
  private cd = inject(ChangeDetectorRef);
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private photonService = inject(PhotonService);

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
  /** The placement whose area is being drawn, and the corners clicked so far. */
  drawingZone: number | undefined;
  zoneDraft: { x: number; y: number }[] = [];
  readonly zoneCorners = ZONE_CORNERS;
  drawShift = { centerShiftX: NaN, centerShiftY: NaN, ratio: NaN };
  step: number | undefined;
  materialIconNames = materialIconNames;
  voidTogglePairs = defaultVoidTogglePairs();
  /** base characteristic of the function's concept, undefined for functions without input */
  functionIdToCharacteristic = new Map<string, DeviceTypeCharacteristicsModel | undefined>();

  form = new FormGroup({
    image: new FormControl<string | null>(null),
    bbox: new FormControl<MapSection | null>(null),
    placements: new FormArray([].map(this.newPlacement)),
    dotSize: new FormControl<number>(25, { validators: [Validators.required, Validators.min(1)] }),
    showUnplacedTable: new FormControl<boolean>(false),
  });
  name = new FormControl<string>('', Validators.required);

  defaultCriteria: DeviceGroupCriteriaModel[] = [
    { aspect_id: '', device_class_id: '', interaction: '', function_id: fpCriteriaConnectionStatus },
  ];

  aspectRatio = 1;
  /** CSS pixels of the widget's drawing area, the map section is drawn at this size */
  imageSize: number[] | undefined;
  cropping = false;
  croppedImage?: string;
  selectingSection = false;
  /** created on first use, so only a widget showing a map section loads tiles */
  sectionMap: OlMap | undefined;
  maySearchSection = this.photonService.userMaySearch();
  sectionSearch = new FormControl<string | PhotonHit>('');
  sectionHits: PhotonHit[] = [];
  sectionAttribution = basemapAttribution();
  canLocate = 'geolocation' in navigator;

  @ViewChild('fileInput', { static: true }) public fileInput!: ElementRef;
  @ViewChild('canvas', { static: false }) canvas: ElementRef<HTMLCanvasElement> | undefined;


  constructor() {
    const data = inject<{
        dashboardId: string;
        widgetId: string;
        userHasUpdateNameAuthorization: boolean;
        userHasUpdatePropertiesAuthorization: boolean;
        aspectRatio: number;
        imageSize?: number[];
    }>(MAT_DIALOG_DATA);

    this.dashboardId = data.dashboardId;
    this.widgetId = data.widgetId;
    this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
    this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    this.aspectRatio = data.aspectRatio;
    this.imageSize = data.imageSize;

    this.sectionSearch.valueChanges.pipe(
      debounceTime(300),
      // a selected hit is the value as well, it is not searched for again
      map(v => typeof v === 'string' ? v.trim() : ''),
      distinctUntilChanged(),
      switchMap(q => q.length < photonMinQueryLength ? of([]) : this.photonService.search(q)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(hits => {
      this.sectionHits = hits;
      this.cd.markForCheck();
    });
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
      // the device groups arrive next to the placements, so their controls can only be described now
      const controllingFunctionIds: string[] = [];
      this.form.controls.placements.controls.forEach(p =>
        controllingFunctionIds.push(...this.getControllingCriteria(p.value.deviceGroupId || '').map(c => c.function_id)));
      this.loadCharacteristics(controllingFunctionIds).subscribe();
      this.form.controls.image.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.draw());
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
        this.sectionMap?.updateSize();
      }, 30);
    }));
    ro.observe(this.el.nativeElement);
  }

  draw() {
    if (this.canvas !== undefined) {
      this.drawShift = draw(this.canvas.nativeElement, { floorplan: this.form.getRawValue() } as FloorplanWidgetPropertiesModel, this.form.value.placements?.map((_2, i) => {
        return { text: '' + i };
      }), this.zoneDraft);
      this.cd.markForCheck();
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
      this.form.patchValue({ image: reader.result as string, bbox: null });
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
    this.form.patchValue({ image: undefined, bbox: null });
  }

  addNewPlacement(): void {
    this.form.controls.placements.push(this.newPlacement());
    this.form.controls.placements.updateValueAndValidity();
  }

  newPlacement(value?: FloorplanWidgetCapabilityModel): FormGroup {
    const fg = this.fb.group({
      criteria: new FormControl<DeviceGroupCriteriaModel | null>(null),
      tooltipCriteria: new FormControl<DeviceGroupCriteriaModel[] | null>(null),
      deviceGroupId: new FormControl<string>(''),
      alias: new FormControl<string>(''),
      showAlias: new FormControl<boolean>(false),
      showAliasWhenZoomed: new FormControl<boolean>(false),
      position: new FormGroup({ // null until placed on the map
        x: new FormControl<number | null>(null),
        y: new FormControl<number | null>(null),
      }),
      // corners of the coloured area, empty until one is drawn on the map
      zone: new FormControl<{ x: number; y: number }[]>([]),
      coloring: new FormArray([].map(this.newColoring)),
      valueLow: new FormControl<number | null>(null),
      valueHigh: new FormControl<number | null>(null),
      colorLow: new FormControl<string>('#808080'),
      colorHigh: new FormControl<string>('#808080'),
    });
    fg.controls.criteria.valueChanges.pipe(concatMap(c => this.loadCharacteristics(c?.function_id === undefined ? [] : [c.function_id])), takeUntilDestroyed(this.destroyRef)).subscribe();
    // the controlling criteria of the group are offered as controls, annotated with the input they get
    fg.controls.deviceGroupId.valueChanges.pipe(concatMap(id => this.loadCharacteristics(this.getControllingCriteria(id || '').map(c => c.function_id))), takeUntilDestroyed(this.destroyRef)).subscribe();
    if (value !== undefined) {
      fg.patchValue(value);
    }
    return fg;
  }

  /** Caches the base characteristic of the concept of every given function, which describes its input */
  private loadCharacteristics(functionIds: string[]): Observable<null> {
    const missing = functionIds
      .filter(id => !this.functionIdToCharacteristic.has(id))
      .filter((v, i, a) => a.indexOf(v) === i);
    if (missing.length === 0) {
      return of(null);
    }
    // functions the repository does not know, e.g. the connection status, keep their empty entry
    missing.forEach(id => this.functionIdToCharacteristic.set(id, undefined));
    return this.deviceGroupsService.getFunctionListByIds(missing).pipe(
      concatMap(functions => this.conceptsService.getConceptsWithCharacteristics({ ids: functions.map(f => f.concept_id) })
        .pipe(map(concepts => ({ concepts, functions })))),
      map(res => {
        res.functions.forEach(f => {
          const concept = res.concepts.result.find(conc => f.concept_id === conc.id);
          this.functionIdToCharacteristic.set(f.id, concept?.characteristics.find(c => c.id === concept.base_characteristic_id));
        });
        return null;
      }));
  }

  addNewColoring(arr: FormArray): void {
    let val = { value: 100000, color: '#000000', showValue: false, showValueWhenZoomed: false, icon: 'circle' };
    if (arr.length > 0) {
      val = arr.at(arr.length - 1).getRawValue();
    }
    arr.push(this.newColoring(val));
  }

  newColoring(value?: {
    value: number | string;
    color: string;
    showValue: boolean;
    showValueWhenZoomed: boolean;
    icon: string;
  }): FormGroup {
    const fg = this.fb.group({
      value: new FormControl<number | string>(0),
      color: new FormControl(''),
      showValue: new FormControl(false),
      showValueWhenZoomed: new FormControl(false),
      icon: new FormControl(''),
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
    // the image to place on is hidden while it is cropped or a map section is chosen; the button is disabled
    // then, but stays hoverable for its tooltip, so its clicks still arrive here
    if (this.cropping || this.selectingSection) {
      return;
    }
    this.placing = i;
  }

  placeSelected($event: MouseEvent) {
    if (this.drawingZone !== undefined) {
      this.zoneDraft.push(this.relativePoint($event));
      this.draw();
      return;
    }
    if (this.placing === undefined) {
      return;
    }
    this.form.controls.placements.at(this.placing).patchValue({ position: this.relativePoint($event) });
    this.placing = undefined;
    this.draw();
  }

  /** Where a click landed on the image, as the fractions the model stores. */
  private relativePoint($event: MouseEvent): { x: number; y: number } {
    const img = image({ floorplan: this.form.getRawValue() } as FloorplanWidgetPropertiesModel);
    return {
      x: ($event.offsetX - this.drawShift.centerShiftX) / (img.naturalWidth * this.drawShift.ratio),
      y: ($event.offsetY - this.drawShift.centerShiftY) / (img.naturalHeight * this.drawShift.ratio),
    };
  }

  /** Starts collecting the corners of the area a placement colours; every click on the image adds one. */
  drawZone(i: number) {
    if (this.cropping || this.selectingSection) {
      return;
    }
    this.placing = undefined;
    this.drawingZone = i;
    this.zoneDraft = [];
    this.draw();
  }

  /** Keeps the drawn area, or leaves the placement as it was when too few corners were set. */
  finishZone() {
    if (this.drawingZone !== undefined && this.zoneDraft.length >= ZONE_CORNERS) {
      this.form.controls.placements.at(this.drawingZone).patchValue({ zone: this.zoneDraft });
    }
    this.cancelZone();
  }

  cancelZone() {
    this.drawingZone = undefined;
    this.zoneDraft = [];
    this.draw();
  }

  undoZoneCorner() {
    this.zoneDraft.pop();
    this.draw();
  }

  /** Drops the area, so the placement shows its pill at its position again. */
  removeZone(i: number) {
    this.form.controls.placements.at(i).patchValue({ zone: [] });
    this.draw();
  }

  zoneOf(i: number): { x: number; y: number }[] {
    return this.form.controls.placements.at(i).getRawValue().zone || [];
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

  /** Criteria with a value to display */
  getMeasuringCriteria(deviceGroupId: string): DeviceGroupCriteriaModel[] {
    return (this.getDeviceGroup(deviceGroupId)?.criteria || []).filter(c => !isControllingFunction(c.function_id));
  }

  /** Criteria that can be executed, offered as controls */
  getControllingCriteria(deviceGroupId: string): DeviceGroupCriteriaModel[] {
    return (this.getDeviceGroup(deviceGroupId)?.criteria || []).filter(c => isControllingFunction(c.function_id));
  }

  /**
   * The controls left to select for a placement. A displayed measurement is operated through its own
   * value in the widget, so the control it already gives access to is not offered a second time.
   */
  getSelectableControllingCriteria(tab: FormGroup): DeviceGroupCriteriaModel[] {
    const deviceGroupId = tab.value.deviceGroupId || '';
    const all = this.getControllingCriteria(deviceGroupId);
    const displayed: DeviceGroupCriteriaModel[] = [tab.value.criteria, ...(tab.value.tooltipCriteria || [])]
      .filter(c => c != null && !isControllingFunction(c.function_id));
    const implied: DeviceGroupCriteriaModel[] = [];
    displayed.forEach(c => implied.push(...impliedControllingCriteria(c, this.stateSourceContext(deviceGroupId, displayed), this.voidTogglePairs)));
    return all.filter(c => !implied.some(i => this.compareCriteriaWithoutInteraction(c, i)));
  }

  private stateSourceContext(deviceGroupId: string, displayed: DeviceGroupCriteriaModel[]): StateSourceContextModel {
    return {
      criteria: this.getDeviceGroup(deviceGroupId)?.criteria || [],
      configured: displayed,
      aspects: this.aspects,
      conceptOf: (functionId: string) => this.functions.find(f => f.id === functionId)?.concept_id,
      // the device types are not loaded here, the dialog only needs to know whether a control is implied
      serviceGroups: [],
      describe: c => this.describeCriteria(c),
      // no reportedAmbiguities: the dialog resolves this while rendering, and the widget reports them
    };
  }

  private compareCriteriaWithoutInteraction(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return a.function_id === b.function_id && a.device_class_id === b.device_class_id && a.aspect_id === b.aspect_id;
  }

  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string {
    if (criteria == null) {
      return '';
    }
    switch (criteria.function_id) {
      case fpCriteriaConnectionStatus: return 'Connection Status';
      default: {
        const f = this.functions.find(f2 => f2.id === criteria.function_id);
        // the display name is optional, so fall back to the name before showing the raw id
        return [
          f?.display_name || f?.name || criteria.function_id,
          criteria.device_class_id === '' ? '' : this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '',
          criteria.aspect_id === '' ? '' : this.aspects.find(a => a.id === criteria.aspect_id)?.name || '',
        ].filter(part => part !== '').join(' ');
      }
    }
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

  isPlaced(tab: FormGroup<any>): boolean {
    return isPlaced(tab.getRawValue() as FloorplanWidgetCapabilityModel);
  }

  removePosition(i: number) {
    this.placing = undefined;
    this.form.controls.placements.at(i).patchValue({ position: { x: null, y: null } });
    this.draw();
  }

  /**
   * Drops the interaction, which the widget does not distinguish, and the duplicates that creates. Also
   * drops criteria combining more than one aspect: this dialog offers single-aspect choices only, and the
   * backend also generates one criterion per single aspect (with ancestors), so no aspect is lost.
   */
  private filterCriteria(d: DeviceGroupModel) {
    d.criteria?.forEach(c => c.interaction = '');
    d.criteria = d.criteria
      ?.filter(c => criteriaAspectIds(c).length <= 1)
      .filter((v, i, a) => a.findIndex(v2 => this.compareCriteria(v, v2)) === i);
  }

  criteriaIsNumeric(tab: FormGroup): boolean {
    const functionId = tab.controls.criteria.value?.function_id;
    if (functionId === undefined) {
      return false;
    }
    return isNumericCharacteristic(this.functionIdToCharacteristic.get(functionId));
  }

  startCropping() {
    this.cropping = true;
  }

  stopCropping(save: boolean) {
    this.cropping = false;
    if (save) {
      this.form.patchValue({ image: this.croppedImage || null });
    }
    this.croppedImage = undefined;
    setTimeout(() => {
      this.draw();
    }, 30);
  }

  startSelectingSection() {
    if (this.sectionMap === undefined) {
      // the coordinates are lon/lat, as in the networks dialog
      useGeographic();
      this.sectionMap = new OlMap({
        // below zoom 3 the view can reach past the latitudes Web Mercator covers, the section would not match the image
        view: new View({ center: [12.380809087977605, 51.3386072545588], zoom: 5, minZoom: 3, maxZoom: 21, enableRotation: false }),
        controls: [],
      });
      const sectionMap = this.sectionMap;
      basemapLayer().then(
        layer => sectionMap.addLayer(layer),
        () => this.errorHandlerService.showErrorInSnackBar('Could not load the map section'));
    }
    this.selectingSection = true;
    // the map gets its element with the next change detection, its size is known only then
    setTimeout(() => {
      this.sectionMap?.updateSize();
      const bbox = this.form.value.bbox;
      if (bbox) {
        this.sectionMap?.getView().fit(bbox);
      }
    });
  }

  stopSelectingSection(save: boolean) {
    const sectionMap = this.sectionMap;
    if (!save || sectionMap === undefined) {
      this.selectingSection = false;
      setTimeout(() => this.draw(), 30);
      return;
    }
    const bbox = sectionMap.getView().calculateExtent(sectionMap.getSize());
    // a hidden widget has no size, its section is then drawn as large as it was chosen
    const size = this.imageSize !== undefined && this.imageSize[0] > 0 && this.imageSize[1] > 0 ? this.imageSize : sectionMap.getSize() || [0, 0];
    renderSection(bbox, size).then(rendered => {
      this.applySection(rendered.image, rendered.section);
      this.selectingSection = false;
      this.cd.markForCheck();
      for (let i = 0; i < 5; i++) {
        setTimeout(() => { // the canvas shows again only after the next change detection, as after an upload
          this.draw();
        }, i * 100);
      }
    }, () => this.errorHandlerService.showErrorInSnackBar('Could not load the map section'));
  }

  hitLabel(hit: PhotonHit | string | null): string {
    return typeof hit === 'string' ? hit : hit?.label || '';
  }

  /** Moves the map to a found place, an area as a whole, an address close enough to tell the buildings apart */
  showHit(hit: PhotonHit) {
    if (hit.extent !== undefined) {
      this.sectionMap?.getView().fit(hit.extent, { maxZoom: 18 });
    } else {
      this.centerSection(hit.lon, hit.lat);
    }
  }

  private centerSection(lon: number, lat: number) {
    const view = this.sectionMap?.getView();
    view?.setCenter([lon, lat]);
    view?.setZoom(18);
  }

  /** Without an animation, a click during one would start from the zoom it had reached and fall short */
  zoomSection(delta: number) {
    const view = this.sectionMap?.getView();
    const zoom = view?.getZoom();
    if (view !== undefined && zoom !== undefined) {
      view.setZoom(zoom + delta);
    }
  }

  /** Moves the map to where the device is, the browser asks for permission first */
  locateMe() {
    navigator.geolocation.getCurrentPosition(
      position => this.centerSection(position.coords.longitude, position.coords.latitude),
      () => this.errorHandlerService.showErrorInSnackBar('Could not determine your location'),
    );
  }

  /** Shows the section, placed elements keep their spot on the map */
  applySection(snapshot: string, bbox: MapSection) {
    const previous = this.form.value.bbox;
    if (previous) {
      this.form.controls.placements.controls.forEach(p => p.patchValue({ position: moveIntoSection(p.value.position, previous, bbox) }));
    }
    this.form.patchValue({ image: snapshot, bbox });
  }

  async imageCropped(event: ImageCroppedEvent) {
    if (event.base64) {
      this.croppedImage = event.base64;
    } else if (event.objectUrl) {
      this.croppedImage = await this.objectUrlToBase64(event.objectUrl);
    }
  }

  private objectUrlToBase64(url: string): Promise<string> {
    return fetch(url)
      .then(response => response.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
            return;
          }
          reject(new Error('Failed to convert object URL to base64'));
        };
        reader.onerror = () => reject(new Error('Failed to read cropped image blob'));
        reader.readAsDataURL(blob);
      }));
  }
}
