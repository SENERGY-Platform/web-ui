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

import { isPipelineEditable, PipelineModel } from './pipeline.model';

describe('isPipelineEditable', () => {
    const pipe = (...selections: (unknown[] | undefined)[]) =>
        ({ operators: selections.map((inputSelections) => ({ inputSelections })) }) as unknown as PipelineModel;

    it('is true when one operator has an input selection', () => {
        expect(isPipelineEditable(pipe(undefined, [{}]))).toBeTrue();
    });

    it('is false for a legacy pipeline, whose operators carry none', () => {
        expect(isPipelineEditable(pipe(undefined, []))).toBeFalse();
    });

    it('is false for a pipeline without operators', () => {
        expect(isPipelineEditable(pipe())).toBeFalse();
    });
});
