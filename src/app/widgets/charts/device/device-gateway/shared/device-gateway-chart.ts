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

import { ExtendedHubModel } from '../../../../../modules/devices/networks/shared/networks.model';

export const deviceGatewayColumnColor = '#4484ce';

export interface GatewayDeviceCount {
    name: string;
    count: number;
}

/** One column per gateway, in listing order; a gateway without a device list counts 0 devices. */
export function devicesPerGateway(gateways: ExtendedHubModel[]): GatewayDeviceCount[] {
    return gateways.map((gateway) => ({ name: gateway.name, count: gateway.device_local_ids === null ? 0 : gateway.device_local_ids.length }));
}
