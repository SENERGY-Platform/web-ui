/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { SmartServiceDesignsComponent } from './designs.component';
import { SmartServiceDesignsService } from './shared/designs.service';
import { SmartServiceDesignModel } from './shared/design.model';
import { SmartServiceReleasesService } from '../releases/shared/release.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { UtilService } from '../../../core/services/util.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';

describe('SmartServiceDesignsComponent', () => {
    let fixture: ComponentFixture<SmartServiceDesignsComponent>;
    let component: SmartServiceDesignsComponent;
    let designs: SmartServiceDesignModel[];
    let getDesignList: jasmine.Spy;
    let deleteDesign: jasmine.Spy;
    let navigate: jasmine.Spy;
    let searchText: Subject<string>;

    const design = (id: string): SmartServiceDesignModel => ({ id, name: 'name-' + id, description: 'about ' + id, bpmn_xml: '<bpmn/>', svg_xml: '<svg/>' });

    async function init(rights = { update: true, delete: true, create: true }, count = 2) {
        designs = Array.from({ length: count }, (_, i) => design('d' + i));
        searchText = new Subject<string>();
        getDesignList = jasmine.createSpy('getDesignList').and.callFake((limit: number, offset: number) => of(designs.slice(offset, offset + limit)));
        deleteDesign = jasmine.createSpy('deleteDesign').and.returnValue(of({ status: 200 }));
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, SmartServiceDesignsComponent],
            providers: [
                {
                    provide: SmartServiceDesignsService,
                    useValue: {
                        getDesignList, deleteDesign,
                        userHasUpdateAuthorization: () => rights.update,
                        userHasDeleteAuthorization: () => rights.delete,
                        userHasCreateAuthorization: () => rights.create,
                    },
                },
                { provide: SmartServiceReleasesService, useValue: {} },
                { provide: SearchbarService, useValue: { currentSearchText: searchText, changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: (docs: { key: string }[]) => of(new Map(docs.filter((d) => d.key === 'd0').map((d) => [d.key, 'Missing: urn:x']))) } },
                { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                provideRouter([]),
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        }).compileComponents();
        navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(SmartServiceDesignsComponent);
        component = fixture.componentInstance;
        // the list is loaded when the search emits, which the real searchbar does asynchronously
        fixture.detectChanges();
        searchText.next('');
        fixture.detectChanges();
    }

    const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));

    async function menuLabels(row: number): Promise<string[]> {
        (fixture.nativeElement.querySelectorAll('tr[mat-row] button[aria-label="Actions"]')[row] as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/^\w+ /, ''));
    }

    it('shows name, description, the preview as an image and a chip for missing metadata', async () => {
        await init();

        const [first, second] = rows();
        expect(first.querySelector('.name-cell')?.textContent).toContain('name-d0');
        expect(first.textContent).toContain('about d0');
        expect(first.querySelector('img.svg-preview')).not.toBeNull();
        expect(first.querySelector('.status-chip.warning')?.textContent).toContain('Metadata missing');
        expect(second.querySelector('.status-chip.warning')).toBeNull();
    });

    it('reads every chunk and pages on the client', async () => {
        await init(undefined, 60);

        expect(getDesignList.calls.allArgs().map((args) => [args[0], args[1]])).toEqual([[50, 0], [50, 50]]);
        expect(rows().length).toBe(20);
    });

    it('reloads exactly once when the refresh button is clicked', async () => {
        await init();
        getDesignList.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();

        expect(getDesignList).toHaveBeenCalledTimes(1);
    });

    it('sends the search text to the server', async () => {
        await init();
        getDesignList.calls.reset();

        searchText.next('heat');

        expect(getDesignList.calls.mostRecent().args[2]).toBe('heat');
    });

    it('opens the designer on a row click with the update right and does nothing without it', async () => {
        await init();
        (rows()[0]).click();
        expect(navigate).toHaveBeenCalledWith('/smart-services/designer/d0');

        TestBed.resetTestingModule();
        await init({ update: false, delete: true, create: true });
        const row = rows()[0];
        row.click();
        expect(row.classList).not.toContain('clickable-row');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('offers the menu actions in the fixed order with delete last', async () => {
        await init();

        expect(await menuLabels(0)).toEqual(['Edit', 'Release', 'Download BPMN', 'Download SVG', 'Delete']);
    });

    it('hides edit and delete without the matching right', async () => {
        await init({ update: false, delete: false, create: false });

        expect(await menuLabels(0)).toEqual(['Release', 'Download BPMN', 'Download SVG']);
    });

    it('deletes after the confirmation and then reloads', async () => {
        await init();
        getDesignList.calls.reset();

        component.deleteDesign(designs[0]);

        expect(deleteDesign).toHaveBeenCalledWith('d0');
        expect(getDesignList).toHaveBeenCalledTimes(1);
    });
});
