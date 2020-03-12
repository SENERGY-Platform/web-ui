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

export interface NetworksHistoryModel {
    name: string;
    device_local_ids: string[];
    log_state: string;
    log_history: {values: LogHistoryValues[] | null};
    log_edge: (string|boolean)[] | null;
}

interface LogHistoryValues {
    0: number;      /** time          */
    1: boolean;     /** connected     */
    2: string;      /** connectorName */
}

