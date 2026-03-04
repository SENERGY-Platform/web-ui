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

import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HubModel } from '../shared/networks.model';
import { Attribute } from '../../device-instances/shared/device-instances.model';
import { AddTagFn } from '@ng-matero/extensions/select';
import { Feature, Map as OlMap, View } from 'ol';
import Collection from 'ol/Collection';
import Translate from 'ol/interaction/Translate';
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom';
import Control from 'ol/control/Control';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { useGeographic } from 'ol/proj';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { getCenter } from 'ol/extent';

@Component({
    templateUrl: './networks-edit-dialog.component.html',
    styleUrls: ['./networks-edit-dialog.component.css'],
})
export class NetworksEditDialogComponent implements OnInit {
    network: HubModel;
    knownAttributes = ['last_message_max_age', 'senergy/lora/eui'];
    hiddenAttributes = ['location-lat', 'location-lon'];
    @ViewChild('content') content: ElementRef | undefined;
    @ViewChild('mapBody') mapBody: ElementRef | undefined;
    mapView = new View({
        center: [0, 0],
        zoom: 1,
        maxZoom: 19,
    });
    map = new OlMap({
        view: this.mapView,
        controls: [],
        layers: [
            new TileLayer({
                source: new OSM(),
            }),
        ],
        target: 'ol-map'
    });
    mapVectorLayer = new VectorLayer();
    translateInteraction: Translate | undefined;
    isTranslating = false;
    zoomControl: Control | undefined;

    constructor(private cd: ChangeDetectorRef, private dialogRef: MatDialogRef<NetworksEditDialogComponent>, @Inject(MAT_DIALOG_DATA) network?: HubModel) {
        this.network = network || {
            id: '',
            name: '',
            hash: '',
            owner_id: '',
            device_local_ids: null,
            device_ids: null,
        };
        this.network.attributes?.forEach(value => {
            if (!this.knownAttributes.includes(value.key) === false && !this.hiddenAttributes.includes(value.key)) {
                this.addAttribute()(value.key);
            }
        });
    }

    ngOnInit() {
        useGeographic();
        this.buildMap();
    }

    buildMap() {
        if (this.mapCalcHeight() === undefined) {
            setTimeout(() => this.buildMap(), 100);
            this.cd.markForCheck();
            return;
        }
        const features: Feature[] = [];
        let place: number[] = [12.380809087977605, 51.3386072545588];
        let zoom = 5;

        const latAttr = this.network.attributes?.find(a => a.key === 'location-lat')?.value;
        const lonAttr = this.network.attributes?.find(a => a.key === 'location-lon')?.value;
        if (latAttr !== undefined && lonAttr !== undefined) {
            place = [parseFloat(lonAttr), parseFloat(latAttr)];
            zoom = 15;
        }
        const point = new Point(place);
        const feature = new Feature(point);
        features.push(feature);

        const vectorSource = new VectorSource({
            features: features,
        });

        const featureCollection = new Collection(features);

        if (this.translateInteraction) {
            this.map.removeInteraction(this.translateInteraction);
            this.translateInteraction = undefined;
        }

        this.mapVectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                image: new Icon({
                    anchor: [0.5, 1],
                    src: 'assets/img/geo-alt-fill.svg',
                    scale: 1.5,
                })
            })
        });

        // allow translating (dragging) the feature and update attributes on drop
        this.translateInteraction = new Translate({ features: featureCollection });
        this.map.addInteraction(this.translateInteraction);
        this.translateInteraction.on('translatestart', () => {
            this.isTranslating = true;
            this.setMapCursor('grabbing');
        });
        this.translateInteraction.on('translateend', () => {
            this.isTranslating = false;
            this.setMapCursor('grab');
            try {
                const geom = feature.getGeometry() as Point;
                const coords = geom.getCoordinates();
                const lon = coords[0];
                const lat = coords[1];

                if (!this.network.attributes) {
                    this.network.attributes = [];
                }
                const latAttr = this.network.attributes.find(a => a.key === 'location-lat');
                const lonAttr = this.network.attributes.find(a => a.key === 'location-lon');
                if (latAttr) {
                    latAttr.value = String(lat);
                } else {
                    this.network.attributes.push({ key: 'location-lat', value: String(lat), origin: 'web-ui' });
                }
                if (lonAttr) {
                    lonAttr.value = String(lon);
                } else {
                    this.network.attributes.push({ key: 'location-lon', value: String(lon), origin: 'web-ui' });
                }
                this.cd.markForCheck();
            } catch (_) {
                // ignore
            }
        });

        // change cursor to indicate draggable marker when hovering
        this.map.on('pointermove', (evt: any) => {
            if (this.isTranslating) {
                return;
            }
            if (evt.dragging) {
                return;
            }
            const hit = this.map.hasFeatureAtPixel(evt.pixel);
            this.setMapCursor(hit ? 'grab' : '');
        });

        // disable zoom on scroll wheel and add zoom buttons
        this.disableScrollZoom();
        this.addZoomControls();

        const extent = vectorSource.getExtent();
        if (extent !== undefined && extent !== null) {
            this.mapView.setCenter(getCenter(extent));
        } else {
            this.mapView.setCenter(place);
        }
        this.map.addLayer(this.mapVectorLayer);
        this.mapView.setZoom(zoom);
        this.cd.markForCheck();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.network);
    }

    removeAttr(i: number) {
        if (!this.network.attributes) {
            this.network.attributes = [];
        }
        this.network.attributes.splice(i, 1);
    }

    addAttribute(): AddTagFn {
        const that = this;
        return (text: string) => {
            that.knownAttributes.push(text);
            const tmp = [...that.knownAttributes];
            tmp.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            that.knownAttributes = [];
            that.knownAttributes = tmp;
        };
    }

    addAttr() {
        if (!this.network.attributes) {
            this.network.attributes = [];
        }
        this.network.attributes.push({ key: '', value: '', origin: 'web-ui' });
    }

    editableAttribute(attr: Attribute) {
        return !attr.origin || attr.origin === '' || attr.origin === 'web-ui';
    }

    setMapCursor(cursor: string) {
        const el = document.getElementById('ol-map');
        if (el) {
            (el as HTMLElement).style.cursor = cursor;
        }
    }

    disableScrollZoom() {
        // remove any existing mouse-wheel zoom interactions
        this.map.getInteractions().forEach(interaction => {
            if (interaction instanceof MouseWheelZoom) {
                this.map.removeInteraction(interaction);
            }
        });

        // add a mouse-wheel zoom interaction that only works when Ctrl (or Meta on macOS) is pressed
        const wheel = new MouseWheelZoom({
            condition: (mapBrowserEvent: any) => {
                const orig = mapBrowserEvent && mapBrowserEvent.originalEvent;
                if (!orig) {
                    return false;
                }
                const e = orig as WheelEvent;
                return Boolean(e.ctrlKey || e.metaKey);
            }
        });
        this.map.addInteraction(wheel);
    }

    addZoomControls() {
        // remove existing control if present
        if (this.zoomControl) {
            this.map.removeControl(this.zoomControl);
            this.zoomControl = undefined;
        }

        const container = document.createElement('div');
        container.className = 'ol-zoom-buttons ol-unselectable ol-control';
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '6px';

        const btnStyle = 'width:32px;height:32px;border-radius:4px;border:1px solid rgba(0,0,0,0.2);background:#fff;cursor:pointer;font-size:18px;line-height:28px;text-align:center;padding:0;';

        const btnIn = document.createElement('button');
        btnIn.type = 'button';
        btnIn.title = 'Zoom in';
        btnIn.innerText = '+';
        btnIn.setAttribute('aria-label', 'Zoom in');
        btnIn.style.cssText = btnStyle;
        btnIn.onclick = () => {
            const z = this.mapView.getZoom() || 0;
            this.mapView.setZoom(z + 1);
        };

        const btnOut = document.createElement('button');
        btnOut.type = 'button';
        btnOut.title = 'Zoom out';
        btnOut.innerText = '−';
        btnOut.setAttribute('aria-label', 'Zoom out');
        btnOut.style.cssText = btnStyle;
        btnOut.onclick = () => {
            const z = this.mapView.getZoom() || 0;
            this.mapView.setZoom(z - 1);
        };

        container.appendChild(btnIn);
        container.appendChild(btnOut);

        this.zoomControl = new Control({ element: container });
        this.map.addControl(this.zoomControl);
    }

    mapCalcHeight(): number | undefined {
        if (this.mapBody === undefined) {
            return undefined;
        }
        const res = [this.mapBody.nativeElement.offsetWidth * .5];
        if (this.content !== undefined) {
            res.push(this.content?.nativeElement.offsetHeight - 75);
        }
        return Math.min(...res);
    }
}
