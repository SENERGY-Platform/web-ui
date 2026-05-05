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

import { Injectable } from '@angular/core';
import { dia, util } from 'jointjs';
import { LinkIOModel } from '../shared/diagram.model';
import { IOModel } from '../../operator-repo/shared/operator.model';
import { NodeElementDefinition } from './node-element-definition';

export interface NodeConfig {
    id?: string;
    name: string;
    image: string;
    inputs: string[];
    outputs: string[];
    config: IOModel[];
    operatorId: string;
    version?: number;
    position: NodePosition;
    deploymentType: 'cloud' | 'local' | '';
}

export interface NodePosition {
    x: number;
    y: number;
}

export interface NodeSize {
    width: number;
    height: number;
}

@Injectable({
    providedIn: 'root'
})
export class NodeFactory {
    private readonly NODE_MIN_HEIGHT = 100;
    private readonly NODE_WIDTH = 250;
    private readonly PORT_CIRCLE_RADIUS = 20;
    private readonly PORT_SPACING = 30;

    private readonly CLOUD_COLOR = '#4484ce';
    private readonly LOCAL_COLOR = '#ddd';

    private readonly LINK_ATTRS = {
        '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z' }
    };

    public createNode(config: NodeConfig): any {
        const size = this.calculateNodeSize(config.inputs, config.outputs);
        const fillColor = config.deploymentType === 'cloud'
            ? this.CLOUD_COLOR
            : this.LOCAL_COLOR;

        const node = new NodeElementDefinition({
            type: 'senergy.NodeElement',
            inPorts: config.inputs,
            outPorts: config.outputs,
            size,
            name: config.name,
            image: config.image,
            config: config.config,
            operatorId: config.operatorId,
            version: config.version,
        });

        if (config.id) {
            node.prop('id', config.id, { rewrite: true });
        }

        node.prop('deploymentType', config.deploymentType);
        node.position(config.position.x, config.position.y);

        this.applyNodeStyling(node, config.name, fillColor);

        return node;
    }

    /**
     * Apply styling to a node
     */
    private applyNodeStyling(node: any, name: string, fillColor: string): void {
        node.attr({
            label: {
                visibility: 'visible',
                text: name,
            },
            headerlabel: {
                text: node.id,
            },
            body: {
                cursor: 'default',
                visibility: 'visible',
                fill: fillColor,
            },
            button: {
                event: 'element:button:pointerdown',
                fill: 'orange',
                stroke: 'black',
                strokeWidth: 2,
            },
            button2: {
                event: 'element:button2:pointerdown',
                fill: 'grey',
                stroke: 'black',
                strokeWidth: 2,
            },
            buttonLabel: {
                text: ' X ',
                fill: 'black',
                fontSize: 9,
                fontWeight: 'bold',
            },
            buttonLabel2: {
                text: 'Copy Id',
                fill: 'black',
                fontSize: 9,
                fontWeight: 'bold',
            },
        });
    }

    /**
     * Calculate the size of a node based on its ports
     */
    private calculateNodeSize(
        inputs: string[] = [],
        outputs: string[] = []
    ): NodeSize {
        const heightBasedOnOutputs =
            this.PORT_CIRCLE_RADIUS * outputs.length + this.PORT_SPACING;
        const heightBasedOnInputs =
            this.PORT_CIRCLE_RADIUS * inputs.length + this.PORT_SPACING;

        let height = Math.max(heightBasedOnInputs, heightBasedOnOutputs);
        height = Math.max(height, this.NODE_MIN_HEIGHT);

        return {
            height,
            width: this.NODE_WIDTH
        };
    }

    /**
     * Create a link between two nodes
     */
    public createLink(source: LinkIOModel, target: LinkIOModel): dia.Link {
        const link = new dia.Link({
            attrs: this.LINK_ATTRS,
        });

        link.source({ id: source.id, port: source.port });
        link.target({ id: target.id, port: target.port });

        return link;
    }

    /**
     * Create multiple links at once
     */
    public createLinks(connections: Array<{ source: LinkIOModel; target: LinkIOModel }>): dia.Link[] {
        return connections.map(conn => this.createLink(conn.source, conn.target));
    }
}