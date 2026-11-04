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

import { PermissionsRightsModel } from 'src/app/modules/permissions/shared/permissions-rights.model';
import { Attribute } from '../../device-instances/shared/device-instances.model';

export interface HubModel {
    id: string;
    name: string;
    hash: string;
    owner_id: string;
    device_local_ids: string[] | null;
    device_ids: string[] | null;
    attributes?: Attribute[];
}

export interface ExtendedHubTotalModel {
    result: ExtendedHubModel[];
    total: number;
}

export interface ExtendedHubModel extends HubModel {
    connection_state: 'online' | 'offline' | '';
    shared: boolean;
    permissions: PermissionsRightsModel;
}

/** Latest health report of a hub as answered by connection-log; `report` is the raw report and not shown. */
export interface HubHealthModel {
    hub_id: string;
    /** 0 undetermined, 1 healthy, 2 unhealthy */
    state: number;
    reasons: string[];
    report: unknown;
    report_time: string;
    received: string;
    /** received longer ago than the backend's stale age */
    stale: boolean;
}

export interface HubModuleVersion {
    id: string;
    name: string;
    source: string;
    channel: string;
    version: string;
    /** empty when the module is up to date */
    next_version: string;
}

/** The part of a gateway health report that carries the module versions. */
export interface HubHealthReport {
    /** absent or null when the gateway cannot tell */
    module_versions?: HubModuleVersion[] | null;
    module_versions_error?: string;
}

/** Reads the module versions from `HubHealthModel.report`; undefined when the report does not have that shape. */
export function readHubHealthReport(report: unknown): HubHealthReport | undefined {
    if (typeof report !== 'object' || report === null) {
        return undefined;
    }
    const raw = report as Record<string, unknown>;
    const modules = raw['module_versions'];
    const error = raw['module_versions_error'];
    if (error !== undefined && typeof error !== 'string') {
        return undefined;
    }
    if (modules === undefined || modules === null) {
        return { module_versions: modules, module_versions_error: error };
    }
    if (!Array.isArray(modules) || !modules.every(isHubModuleVersion)) {
        return undefined;
    }
    return { module_versions: modules, module_versions_error: error };
}

function isHubModuleVersion(value: unknown): value is HubModuleVersion {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const raw = value as Record<string, unknown>;
    return ['id', 'name', 'source', 'channel', 'version', 'next_version'].every(key => typeof raw[key] === 'string');
}

export interface LoraCertsModel {
    certificate: string;
    key: string;
    expires_at: string;
}
