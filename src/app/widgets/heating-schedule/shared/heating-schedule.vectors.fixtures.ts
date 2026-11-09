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

/** Cases computed by the process script of the smart service; the plan logic has to reproduce every one. */
export interface ValidVector {
    plan: string;
    schedule: string;
    setback: number;
    now: string;
    temperature: number;
    next_at: string;
    next_temperature: number;
}

export interface InvalidVector {
    schedule: string;
    setback: number | string;
    error: string;
}

export const VALID_VECTORS: ValidVector[] = [
    {
        'plan': 'work',
        'schedule': '{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-11-09T04:59:00Z',
        'temperature': 17,
        'next_at': '2026-11-09T05:00:00.000Z',
        'next_temperature': 20
    },
    {
        'plan': 'work',
        'schedule': '{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-11-09T05:00:00Z',
        'temperature': 20,
        'next_at': '2026-11-09T19:00:00.000Z',
        'next_temperature': 17
    },
    {
        'plan': 'work',
        'schedule': '{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-11-13T19:00:00Z',
        'temperature': 17,
        'next_at': '2026-11-16T05:00:00.000Z',
        'next_temperature': 20
    },
    {
        'plan': 'work',
        'schedule': '{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-07-06T03:30:00Z',
        'temperature': 17,
        'next_at': '2026-07-06T04:00:00.000Z',
        'next_temperature': 20
    },
    {
        'plan': 'night',
        'schedule': '{"windows":[{"weekdays":[4],"from":"22:00","to":"02:00","temperature":19}]}',
        'setback': 16,
        'now': '2026-11-14T00:30:00Z',
        'temperature': 19,
        'next_at': '2026-11-14T01:00:00.000Z',
        'next_temperature': 16
    },
    {
        'plan': 'night',
        'schedule': '{"windows":[{"weekdays":[4],"from":"22:00","to":"02:00","temperature":19}]}',
        'setback': 16,
        'now': '2026-11-13T12:00:00Z',
        'temperature': 16,
        'next_at': '2026-11-13T21:00:00.000Z',
        'next_temperature': 19
    },
    {
        'plan': 'overlap',
        'schedule': '{"windows":[{"from":"06:00","to":"22:00","temperature":19},{"weekdays":[0],"from":"07:00","to":"09:00","temperature":22}]}',
        'setback': 16,
        'now': '2026-11-09T06:30:00Z',
        'temperature': 22,
        'next_at': '2026-11-09T08:00:00.000Z',
        'next_temperature': 19
    },
    {
        'plan': 'adjacent',
        'schedule': '{"windows":[{"from":"06:00","to":"12:00","temperature":20},{"from":"12:00","to":"18:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-11-09T06:00:00Z',
        'temperature': 20,
        'next_at': '2026-11-09T17:00:00.000Z',
        'next_temperature': 17
    },
    {
        'plan': 'always',
        'schedule': '{"windows":[{"from":"00:00","to":"00:00","temperature":21}]}',
        'setback': 17,
        'now': '2026-11-09T10:00:00Z',
        'temperature': 21,
        'next_at': '2026-11-16T10:00:00.000Z',
        'next_temperature': 21
    },
    {
        'plan': 'empty',
        'schedule': '{"windows":[]}',
        'setback': 17,
        'now': '2026-11-09T10:00:00Z',
        'temperature': 17,
        'next_at': '2026-11-16T10:00:00.000Z',
        'next_temperature': 17
    },
    {
        'plan': 'gap',
        'schedule': '{"windows":[{"weekdays":[6],"from":"02:30","to":"05:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-03-29T00:00:00Z',
        'temperature': 17,
        'next_at': '2026-03-29T01:00:00.000Z',
        'next_temperature': 20
    },
    {
        'plan': 'fall',
        'schedule': '{"windows":[{"weekdays":[6],"from":"00:00","to":"06:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-10-24T23:00:00Z',
        'temperature': 20,
        'next_at': '2026-10-25T05:00:00.000Z',
        'next_temperature': 17
    },
    {
        'plan': 'halfdegree',
        'schedule': '{"windows":[{"weekdays":[5,6],"from":"08:00","to":"23:30","temperature":21.5}]}',
        'setback': 16,
        'now': '2026-11-14T06:59:00Z',
        'temperature': 16,
        'next_at': '2026-11-14T07:00:00.000Z',
        'next_temperature': 21.5
    },
    {
        'plan': 'halfdegree',
        'schedule': '{"windows":[{"weekdays":[5,6],"from":"08:00","to":"23:30","temperature":21.5}]}',
        'setback': 16,
        'now': '2026-11-15T22:30:00Z',
        'temperature': 16,
        'next_at': '2026-11-21T07:00:00.000Z',
        'next_temperature': 21.5
    },
    {
        'plan': 'midnightEnd',
        'schedule': '{"windows":[{"from":"18:00","to":"24:00","temperature":20}]}',
        'setback': 17,
        'now': '2026-11-09T20:00:00Z',
        'temperature': 20,
        'next_at': '2026-11-09T23:00:00.000Z',
        'next_temperature': 17
    }
];

export const INVALID_VECTORS: InvalidVector[] = [
    {
        'schedule': '{}',
        'setback': 17,
        'error': 'Heizplan braucht eine Liste windows'
    },
    {
        'schedule': '{"windows":[]}',
        'setback': 'x',
        'error': 'Absenktemperatur ist keine Zahl: x'
    },
    {
        'schedule': '{"windows":[]}',
        'setback': '',
        'error': 'Absenktemperatur ist keine Zahl: '
    },
    {
        'schedule': '{"windows":[{"from":"6","to":"20:00","temperature":20}]}',
        'setback': 17,
        'error': 'Zeitfenster 1: Uhrzeit hh:mm erwartet, nicht 6'
    },
    {
        'schedule': '{"windows":[{"from":"06:00","to":"24:30","temperature":20}]}',
        'setback': 17,
        'error': 'Zeitfenster 1: Uhrzeit hh:mm erwartet, nicht 24:30'
    },
    {
        'schedule': '{"windows":[{"weekdays":[7],"from":"06:00","to":"08:00","temperature":20}]}',
        'setback': 17,
        'error': 'Zeitfenster 1: Wochentag 0 (Montag) bis 6 (Sonntag) erwartet, nicht 7'
    },
    {
        'schedule': '{"windows":[{"from":"06:00","to":"08:00"}]}',
        'setback': 17,
        'error': 'Zeitfenster 1: temperature ist keine Zahl'
    },
    {
        'schedule': 'kein json',
        'setback': 17,
        'error': "Unexpected token 'k', \"kein json\" is not valid JSON"
    }
];
