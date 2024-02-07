/*
 * Copyright 2024 InfAI (CC SES)
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


export interface UsedInDeviceTypeQuery {
    resource: string
    with?: string
    count_by?:string
    ids: string[]
}

export interface UsedInDeviceTypeResponseElement {
    count: number
    used_in?: UsedInDeviceTypeResponseDeviceTypeRef[]
}

export interface UsedInDeviceTypeResponseDeviceTypeRef {
    id: string
    name: string
    used_in?: UsedInDeviceTypeResponseServiceRef[]
}

export interface UsedInDeviceTypeResponseServiceRef {
    id: string
    name: string
    used_in?: UsedInDeviceTypeResponseVariableRef[]
}

export interface UsedInDeviceTypeResponseVariableRef {
    id: string
    path: string
}