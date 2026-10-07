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

import { PVPredictionResult } from './prediction.model';

export const pvPredictionAxisTitle = 'Average Power in W';

export interface PvPredictionPoint {
    time: Date;
    value: number;
}

export function pvPredictionPoints(data: PVPredictionResult): PvPredictionPoint[] {
    return data.predictions.map((row) => ({ time: new Date(row.timestamp), value: row.value }));
}

/**
 * The summed prediction of the next `time` hours (or days for level 'd'): that many slots starting with the one that
 * contains now, e.g. "12.35 Wh"; 0 hours sum nothing. A slot is as long as the shortest distance between two
 * prediction timestamps (one hour if there is only one) and starts at its timestamp.
 */
export function nextPvPredictionText(data: PVPredictionResult, level: string, time: number, now: Date): string {
    const hours = level === 'd' ? time * 24 : time;
    const sorted = data.predictions
        .map((p) => ({ start: new Date(p.timestamp).getTime(), value: p.value }))
        .sort((a, b) => a.start - b.start);
    const distances = sorted.slice(1).map((p, i) => p.start - sorted[i].start).filter((d) => d > 0);
    const slot = distances.length === 0 ? 3600000 : Math.min(...distances);
    const upcoming = sorted.filter((p) => p.start + slot > now.getTime()).slice(0, Math.max(0, hours));
    const aggregatedPrediction = upcoming.reduce((accumulator, current) => accumulator + current.value, 0);
    return Math.round(aggregatedPrediction * 100) / 100 + ' Wh';
}
