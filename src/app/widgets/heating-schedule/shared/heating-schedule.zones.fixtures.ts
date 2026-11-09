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

/** Zone resolution computed by the smart service script; `thermostats` is the stored parameter value. */
export interface ZoneVector {
    name: string;
    schedule: string;
    thermostats: string;
    setback: number;
    zones?: Array<{
        name: string;
        devices: string[];
        windows: Array<{ weekdays: number[]; from: string; to: string; temperature: number }>;
        setback: number;
    }>;
    error?: string;
}

export const ZONE_VECTORS: ZoneVector[] = [
    {
        'name': 'legacy plan',
        'schedule': '{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}","{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:bbb\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat bbb\\"}"]',
        'setback': 17,
        'zones': [
            {
                'name': 'Alle',
                'devices': ['urn:infai:ses:device:aaa', 'urn:infai:ses:device:bbb'],
                'windows': [
                    {
                        'weekdays': [0, 1, 2, 3, 4],
                        'from': '06:00',
                        'to': '20:00',
                        'temperature': 20
                    }
                ],
                'setback': 17
            }
        ]
    },
    {
        'name': 'named zones and rest',
        'schedule': '{"zones":[{"name":"Bad","devices":["urn:infai:ses:device:bbb"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}],"setback":19},{"name":"Rest","windows":[]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}","{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:bbb\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat bbb\\"}","{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:ccc\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat ccc\\"}"]',
        'setback': 17,
        'zones': [
            {
                'name': 'Bad',
                'devices': ['urn:infai:ses:device:bbb'],
                'windows': [
                    {
                        'weekdays': [0, 1, 2, 3, 4],
                        'from': '06:00',
                        'to': '20:00',
                        'temperature': 20
                    }
                ],
                'setback': 19
            },
            {
                'name': 'Rest',
                'devices': ['urn:infai:ses:device:aaa', 'urn:infai:ses:device:ccc'],
                'windows': [],
                'setback': 17
            }
        ]
    },
    {
        'name': 'unselected device dropped, empty zone not deployed',
        'schedule': '{"zones":[{"name":"Weg","devices":["urn:infai:ses:device:ccc"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]},{"name":"Da","devices":["urn:infai:ses:device:aaa"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 16,
        'zones': [
            {
                'name': 'Da',
                'devices': ['urn:infai:ses:device:aaa'],
                'windows': [
                    {
                        'weekdays': [0, 1, 2, 3, 4],
                        'from': '06:00',
                        'to': '20:00',
                        'temperature': 20
                    }
                ],
                'setback': 16
            }
        ]
    },
    {
        'name': 'unnamed zone',
        'schedule': '{"zones":[{"devices":["urn:infai:ses:device:aaa"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 17,
        'zones': [
            {
                'name': 'Zone 1',
                'devices': ['urn:infai:ses:device:aaa'],
                'windows': [
                    {
                        'weekdays': [0, 1, 2, 3, 4],
                        'from': '06:00',
                        'to': '20:00',
                        'temperature': 20
                    }
                ],
                'setback': 17
            }
        ]
    },
    {
        'name': 'device in two zones',
        'schedule': '{"zones":[{"name":"X","devices":["urn:infai:ses:device:aaa"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]},{"name":"Y","devices":["urn:infai:ses:device:aaa"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 17,
        'error': 'Thermostat urn:infai:ses:device:aaa steht in X und Y'
    },
    {
        'name': 'two rest zones',
        'schedule': '{"zones":[{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]},{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 17,
        'error': 'Nur eine Zone darf ohne devices die übrigen Thermostate nehmen'
    },
    {
        'name': 'no thermostat in any zone',
        'schedule': '{"zones":[{"name":"X","devices":["urn:infai:ses:device:bbb"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 17,
        'error': 'Keine Zone hat ein Thermostat'
    },
    {
        'name': 'bad zone setback',
        'schedule': '{"zones":[{"name":"Bad","setback":"x","windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}]}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 17,
        'error': 'Bad: setback ist keine Zahl'
    },
    {
        'name': 'neither zones nor windows',
        'schedule': '{}',
        'thermostats': '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:aaa\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Thermostat aaa\\"}"]',
        'setback': 17,
        'error': 'Heizplan braucht eine Liste zones'
    }
];
