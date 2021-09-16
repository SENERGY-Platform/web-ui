/*
 * Copyright 2021 InfAI (CC SES)
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

import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Title } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root',
})
export class ThemingService {
    constructor(@Inject(DOCUMENT) private document: Document, private titleService: Title) {}

    applyTheme() {
        this.titleService.setTitle(environment.title);

        // Load theme css
        const themeUrl = environment.theme + '.css';
        const head = this.document.getElementsByTagName('head')[0];
        const style = this.document.createElement('link');
        style.id = 'client-theme';
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.href = `${themeUrl}`;
        head.appendChild(style);

        // Load facvicon
        const iconPrefix = 'src/img/' + environment.theme + '/';
        this.addIconLink('apple-touch-icon', '57x57', iconPrefix + 'apple-icon-57x57.png', head);
        this.addIconLink('apple-touch-icon', '60x60', iconPrefix + 'apple-icon-60x60.png', head);
        this.addIconLink('apple-touch-icon', '72x72', iconPrefix + 'apple-icon-72x72.png', head);
        this.addIconLink('apple-touch-icon', '76x76', iconPrefix + 'apple-icon-76x76.png', head);
        this.addIconLink('apple-touch-icon', '114x114', iconPrefix + 'apple-icon-114x114.png', head);
        this.addIconLink('apple-touch-icon', '152x52', iconPrefix + 'apple-icon-152x152.png', head);
        this.addIconLink('apple-touch-icon', '180x180', iconPrefix + 'apple-icon-180x180.png', head);

        this.addIconLink('icon', '192x192', iconPrefix + 'android-icon-192x192.png', head, 'image/png');
        this.addIconLink('icon', '32x32', iconPrefix + 'favicon-32x32.png', head, 'image/png');
        this.addIconLink('icon', '96x96', iconPrefix + 'favicon-96x96.png', head, 'image/png');
        this.addIconLink('icon', '16x16', iconPrefix + 'favicon-16x16.png', head, 'image/png');

        this.addIconLink('manifest', null, iconPrefix + 'manifest.json', head);

        const tileColor = this.document.createElement('meta');
        tileColor.name = 'msapplication-TileColor';
        tileColor.content = 'ffffff';
        head.appendChild(tileColor);

        const tileImage = this.document.createElement('meta');
        tileImage.name = 'msapplication-TileImage';
        tileImage.content = iconPrefix + 'ms-icon-144x144.png';
        head.appendChild(tileImage);
    }

    private addIconLink(rel: string, size: string | null, href: string, head: any, type?: string) {
        const style = this.document.createElement('link') as any;
        style.rel = rel;
        style.href = href;
        if (size) {
            style.sizes = size;
        }
        if (type) {
            style.type = type;
        }
        head.appendChild(style);
    }

    getToolbarLogoUrl(): string {
        return 'src/img/' + environment.theme + '/toolbar-logo.svg';
    }
}
