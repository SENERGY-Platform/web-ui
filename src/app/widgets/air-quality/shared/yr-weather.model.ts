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

export interface YrWeatherModel {
    weatherdata: {
        location: {
            name: string;
            type: string;
            country: string;
            timezone: {
                _id: string;
                _utcoffsetMinutes: string;
            };
            location: {
                _altitude: string;
                _latitude: string;
                _longitude: string;
                _geobase: string;
                _geobaseid: string;
            };
        };
        credit: {
            link: {
                _text: string;
                _url: string;
            }
        };
        links: YrLink[];
        meta: {
            lastupdate: string;
            nextupdate: string;
        };
        sun: {
            _rise: string;
            _set: string;
        };
        forecast: {
            tabular: {
                time: YrForecast[];
            };
        };
    };
    cacheUntil?: Date;
}

export interface YrLink {
    _id: string;
    _url: string;
}

export interface YrForecast {
    _from: string;
    _to: string;
    precipitation: {value: number;};
    windDirection: {
        _deg: string;
        _code: string;
        _name: string;
    };
    windSpeed: {
        _mps: string;
        _name: string;
    };
    temperature: {
        _unit: string;
        _value: string;
    };
    pressure: {
        _unit: string;
        _value: string;
    };
    symbol: {
        _name: string;
        _number: string;
        _numberEx: string;
        _var: string;
    };
}
