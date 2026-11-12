/*
 * Copyright 2026 InfAI (CC SES)
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CodeEditorComponent } from './code-editor.component';

// SNRGY-2766: a button lets the editor fill the screen and gives the size back
describe('CodeEditorComponent maximize', () => {
    let fullscreenElement: Element | null;

    function create(fullscreenEnabled: boolean): ComponentFixture<CodeEditorComponent> {
        fullscreenElement = null;
        spyOnProperty(document, 'fullscreenEnabled').and.returnValue(fullscreenEnabled);
        spyOnProperty(document, 'fullscreenElement').and.callFake(() => fullscreenElement);
        TestBed.configureTestingModule({ imports: [CodeEditorComponent, NoopAnimationsModule] });
        const fixture = TestBed.createComponent(CodeEditorComponent);
        fixture.detectChanges();
        return fixture;
    }

    function button(fixture: ComponentFixture<CodeEditorComponent>): HTMLButtonElement | null {
        return fixture.nativeElement.querySelector('.code-editor-maximize');
    }

    it('fills the screen with the editor and restores it', () => {
        const fixture = create(true);
        const frame: HTMLElement = fixture.nativeElement.querySelector('.code-editor');
        const request = spyOn(frame, 'requestFullscreen').and.returnValue(Promise.resolve());
        const exit = spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());

        expect(button(fixture)?.textContent).toContain('fullscreen');
        button(fixture)?.click();
        expect(request).toHaveBeenCalled();

        fullscreenElement = frame;
        document.dispatchEvent(new Event('fullscreenchange'));
        fixture.detectChanges();
        expect(fixture.componentInstance.maximized).toBeTrue();
        expect(button(fixture)?.textContent).toContain('fullscreen_exit');

        button(fixture)?.click();
        expect(exit).toHaveBeenCalled();

        // Esc ends the fullscreen without the button
        fullscreenElement = null;
        document.dispatchEvent(new Event('fullscreenchange'));
        fixture.detectChanges();
        expect(fixture.componentInstance.maximized).toBeFalse();
    });

    it('ignores the fullscreen of another element', () => {
        const fixture = create(true);
        fullscreenElement = document.body;
        document.dispatchEvent(new Event('fullscreenchange'));
        expect(fixture.componentInstance.maximized).toBeFalse();
    });

    it('leaves the fullscreen when the editor goes away in it', () => {
        const fixture = create(true);
        const exit = spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());
        fullscreenElement = fixture.nativeElement.querySelector('.code-editor');
        fixture.destroy();
        expect(exit).toHaveBeenCalled();
    });

    it('offers no button where the browser has no fullscreen', () => {
        expect(button(create(false))).toBeNull();
    });
});
