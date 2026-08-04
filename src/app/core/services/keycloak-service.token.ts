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

import { InjectionToken } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

/**
 * Lives in its own file rather than in core.module.ts: services injecting this token would
 * otherwise import the module that declares them, and the resulting cycle breaks module
 * initialization in the test bundle.
 */
export const keycloakServiceToken = new InjectionToken<KeycloakService>('KeycloakService');
