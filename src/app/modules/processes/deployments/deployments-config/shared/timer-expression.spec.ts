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

import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { isTimerExpression } from './timer-expression';
import { DeploymentsConfigInitializerService } from './deployments-config-initializer.service';
import { V2DeploymentsPreparedModel } from '../../shared/deployments-prepared-v2.model';

/* A timer whose time is an expression is not asked for in the deploy dialog (SNRGY-3350). */
describe('isTimerExpression', () => {
    it('takes JUEL of Camunda models for every kind of timer', () => {
        expect(isTimerExpression('timeDuration', '${timer}')).toBeTrue();
        expect(isTimerExpression('timeCycle', '${cron_0}')).toBeTrue();
        expect(isTimerExpression('timeDate', '#{date}')).toBeTrue();
    });

    it('takes a duration that is no ISO 8601 duration, as a JavaScript timer of the engine', () => {
        expect(isTimerExpression('timeDuration', 'duration')).toBeTrue();
        expect(isTimerExpression('timeDuration', '"PT" + minutes + "M"')).toBeTrue();
    });

    it('asks for fixed and empty times as before', () => {
        expect(isTimerExpression('timeDuration', 'PT5S')).toBeFalse();
        expect(isTimerExpression('timeDuration', 'P1DT2H')).toBeFalse();
        expect(isTimerExpression('timeDuration', '')).toBeFalse();
        expect(isTimerExpression('timeDuration', undefined)).toBeFalse();
        expect(isTimerExpression('timeCycle', '0 0 11 * * ?')).toBeFalse();
        expect(isTimerExpression('timeDate', '2030-01-01T00:00:00Z')).toBeFalse();
    });
});

describe('DeploymentsConfigInitializerService timer expression', () => {
    const deploymentWithTimer = (time: string): V2DeploymentsPreparedModel => ({
        version: 3, id: '', name: 'Timer', description: '', diagram: { svg: '', xml_deployed: '', xml_raw: '' }, executable: true,
        elements: [{ bpmn_id: 'pause', group: null, name: 'pause', order: 0, time_event: { type: 'timeDuration', time }, notification: null, message_event: null, task: null }],
    } as unknown as V2DeploymentsPreparedModel);

    beforeEach(() => TestBed.configureTestingModule({ providers: [DeploymentsConfigInitializerService, FormBuilder] }));

    function timeEvent(time: string) {
        const service = TestBed.inject(DeploymentsConfigInitializerService);
        return service.initFormGroup(deploymentWithTimer(time)).get(['elements', 0, 'time_event'])!;
    }

    it('accepts a duration expression and keeps it for the deployment', () => {
        const control = timeEvent('${timer}');
        expect(control.valid).toBeTrue();
        expect(control.value.time).toBe('${timer}');
    });

    it('still asks for a duration of at least 5 seconds for an empty or short time', () => {
        expect(timeEvent('').hasError('durationLessThan5Seconds')).toBeTrue();
        expect(timeEvent('PT1S').hasError('durationLessThan5Seconds')).toBeTrue();
        expect(timeEvent('PT5S').valid).toBeTrue();
    });
});
