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

import { isDurationText } from '../../../../../core/time/iso-duration';

/**
 * Whether the time of a timer in a prepared deployment is an expression the process evaluates when it reaches the
 * timer, such as "${timer}" of a Camunda model or "duration" of a model whose timer is JavaScript (SNRGY-3350). The
 * deploy dialog shows it instead of asking for a time; sent back unchanged, the automation-engine keeps it. An empty
 * time is no expression: the model left it to the dialog.
 */
export function isTimerExpression(type: string | undefined, time: string | undefined | null): boolean {
    if (!time || time.trim() === '') {
        return false;
    }
    if (/^\s*[$#]\{[\s\S]*\}\s*$/.test(time)) {
        return true;
    }
    return type === 'timeDuration' && !isDurationText(time.trim());
}
