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

import { MtxSelect } from '@ng-matero/extensions/select';

// @ng-matero/extensions no longer re-exports these ng-select callback types, so they are read off MtxSelect's inputs.
export type AddTagFn = Exclude<MtxSelect['addTag'], boolean>;
export type CompareWithFn = MtxSelect['compareWith'];
export type GroupValueFn = NonNullable<MtxSelect['groupValue']>;
