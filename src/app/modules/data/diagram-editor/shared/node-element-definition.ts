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
 *  limitations under the License.
 */

import { dia, shapes, util } from 'jointjs';

/**
 * Custom JointJS Element Definition for Senergy Nodes
 */
export const NodeElementDefinition = dia.Element.define(
    'senergy.NodeElement',
    {
        // Default attributes
        inPorts: [],
        outPorts: [],
        name: '',
        image: '',
        operatorId: '',
        attrs: {
            '.': {
                magnet: false,
            },
            header: {
                refWidth: '100%',
                refHeight: '20%',
                strokeWidth: 2,
                stroke: 'black',
                fill: 'white',
            },
            body: {
                refY: '20%',
                refWidth: '100%',
                refHeight: '80%',
                strokeWidth: 2,
                stroke: 'black',
                fill: 'white',
            },
            headerlabel: {
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '10%',
                fontSize: 10,
                fill: 'black',
            },
            label: {
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                fontSize: 14,
                fill: 'black',
            },
            button: {
                cursor: 'pointer',
                ref: 'buttonLabel',
                refWidth: '150%',
                refHeight: '150%',
                refX: '-25%',
                refY: '-25%',
            },
            button2: {
                cursor: 'pointer',
                ref: 'buttonLabel2',
                refWidth: '150%',
                refHeight: '150%',
                refX: '-25%',
                refY: '-25%',
            },
            buttonLabel: {
                pointerEvents: 'none',
                refX: '100%',
                refY: '-5%',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
            },
            buttonLabel2: {
                pointerEvents: 'none',
                refX: '85%',
                refY: '-5%',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
            },
        },
        ports: {
            groups: {
                in: {
                    position: {
                        name: 'left',
                    },
                    attrs: {
                        portLabel: {
                            fill: '#000',
                        },
                        portBody: {
                            fill: '#fff',
                            stroke: '#000',
                            r: 10,
                            magnet: true,
                        },
                    },
                    label: {
                        position: {
                            name: 'left',
                            args: {
                                y: 10,
                            },
                        },
                    },
                },
                out: {
                    position: {
                        name: 'right',
                    },
                    attrs: {
                        portLabel: {
                            fill: '#000',
                        },
                        portBody: {
                            fill: '#fff',
                            stroke: '#000',
                            r: 10,
                            magnet: true,
                        },
                    },
                    label: {
                        position: {
                            name: 'right',
                            args: {
                                y: 10,
                            },
                        },
                    },
                },
            },
        },
    },
    {
        // Prototype properties
        markup: [
            {
                tagName: 'rect',
                selector: 'header',
            },
            {
                tagName: 'rect',
                selector: 'body',
            },
            {
                tagName: 'text',
                selector: 'headerlabel',
            },
            {
                tagName: 'text',
                selector: 'label',
            },
            {
                tagName: 'rect',
                selector: 'button',
            },
            {
                tagName: 'text',
                selector: 'buttonLabel',
            },
            {
                tagName: 'rect',
                selector: 'button2',
            },
            {
                tagName: 'text',
                selector: 'buttonLabel2',
            },
        ],
        portMarkup: [
            {
                tagName: 'circle',
                selector: 'portBody',
            },
        ],
        portLabelMarkup: [
            {
                tagName: 'text',
                selector: 'portLabel',
            },
        ],

        initialize() {
            // eslint-disable-next-line prefer-rest-params
            shapes.basic.Generic.prototype.initialize.apply(this, arguments as any);
            this.updatePortItems();
        },

        updatePortItems() {
            // Ensure all ports are unique
            const inPorts = util.uniq(this.get('inPorts'));
            const outPorts = util.uniq(this.get('outPorts'));

            const inPortItems = this.createPortItems('in', inPorts);
            const outPortItems = this.createPortItems('out', outPorts);

            this.prop('ports/items', inPortItems.concat(outPortItems));
        },

        createPortItem(group: string, port: string) {
            return {
                id: `${group}-${port}`,
                group,
                attrs: {
                    portLabel: {
                        text: port
                    }
                }
            };
        },

        createPortItems(group: string, ports: string[]) {
            return util.toArray(ports).map((port: string) =>
                this.createPortItem(group, port)
            );
        },
    }
);