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

import { dia, linkTools } from '@joint/core';

/** Links shorter than this get their tools at half size, as in JointJS 3. */
const SHORT_LINK_LENGTH = 105;

/**
 * Link between two operator ports. Keeps the type `link` the flow parser and the designer look for,
 * and is drawn like the default link of JointJS 3, which @joint/core no longer has.
 */
export const LinkDefinition = dia.Link.define('link', {
    attrs: {
        // fill, line joins and the wide hover strip come from joint.css, so the saved flow image keeps plain paths
        line: {
            connection: true,
            stroke: 'black',
        },
        markerTarget: {
            atConnectionRatio: 1,
            d: 'M -10 -5 L 0 0 L -10 5 z',
            fill: 'black',
            stroke: 'black',
        },
        wrapper: {
            connection: true,
        },
    },
}, {
    markup: [
        { tagName: 'path', selector: 'line', className: 'connection' },
        { tagName: 'path', selector: 'markerTarget', className: 'marker-target' },
        { tagName: 'path', selector: 'wrapper', className: 'connection-wrap' },
    ],
});

function shortLinkScale(view: dia.LinkView): number {
    return view.getConnectionLength() < SHORT_LINK_LENGTH ? 0.5 : 1;
}

const RemoveButton = linkTools.Remove.extend({
    children: [
        { tagName: 'circle', selector: 'button', attributes: { r: 11, fill: '#FF0000', cursor: 'pointer' } },
        { tagName: 'path', selector: 'icon', attributes: { d: 'M -5 -5 5 5 M -5 5 5 -5', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3, 'pointer-events': 'none' } },
        { tagName: 'title', textContent: 'Remove link.' },
    ],
    update(this: any) {
        this.options.scale = shortLinkScale(this.relatedView);
        return linkTools.Remove.prototype.update.call(this);
    },
});

const arrowheadAttributes = { fill: '#1ABC9C', stroke: 'none', cursor: 'move' };

function legacyArrowhead(base: any, d: string) {
    return base.extend({
        attributes: { ...arrowheadAttributes, d, class: 'marker-arrowhead' },
        update(this: any) {
            this.options.scale = shortLinkScale(this.relatedView);
            return base.prototype.update.call(this);
        },
    });
}

// Both tips sit on the link end and point away from the link.
const TargetArrowhead = legacyArrowhead(linkTools.TargetArrowhead, 'M -26 -13 L 0 0 L -26 13 z');
const SourceArrowhead = legacyArrowhead(linkTools.SourceArrowhead, 'M 26 -13 L 0 0 L 26 13 z');

const VertexHandle = linkTools.Vertices.VertexHandle.extend({
    tagName: 'g',
    className: 'marker-vertex-group',
    attributes: {},
    children: [
        { tagName: 'circle', className: 'marker-vertex', attributes: { r: 10, fill: '#1ABC9C', cursor: 'move' } },
        {
            tagName: 'g',
            className: 'marker-vertex-remove',
            attributes: { transform: 'translate(14, -14)', cursor: 'pointer' },
            children: [
                { tagName: 'circle', attributes: { r: 7, fill: '#FF0000' } },
                { tagName: 'path', attributes: { d: 'M -3 -3 3 3 M -3 3 3 -3', stroke: '#FFFFFF', 'stroke-width': 2, 'pointer-events': 'none' } },
                { tagName: 'title', textContent: 'Remove vertex.' },
            ],
        },
    ],
    events: {
        'mousedown .marker-vertex': 'onPointerDown',
        'touchstart .marker-vertex': 'onPointerDown',
        'mousedown .marker-vertex-remove': 'onRemovePointerDown',
        'touchstart .marker-vertex-remove': 'onRemovePointerDown',
        dblclick: 'onDoubleClick',
        dbltap: 'onDoubleClick',
    },
    render(this: any) {
        this.renderChildren();
        return this;
    },
    onRemovePointerDown(this: any, evt: Event) {
        evt.stopPropagation();
        evt.preventDefault();
        this.trigger('remove', this, evt);
    },
});

/** The tools a hovered link offers, matching the JointJS 3 link: drag the link body to add a vertex, move or remove vertices, reconnect, remove. */
export function createLinkTools(): dia.ToolsView {
    return new dia.ToolsView({
        // inside the link view, so pointing at a tool keeps the link hovered
        layer: null,
        tools: [
            new linkTools.Vertices({
                handleClass: VertexHandle,
                // the runtime reads interactiveLinkNode; the 4.3 typings misname it interactiveLineNode
                vertexAdding: { interactiveLinkNode: 'wrapper' } as linkTools.Vertices.Options['vertexAdding'],
                redundancyRemoval: false,
                snapRadius: 0,
            }),
            new SourceArrowhead(),
            new TargetArrowhead(),
            new RemoveButton({ distance: (view: dia.LinkView) => 40 * shortLinkScale(view) }),
        ],
    });
}
