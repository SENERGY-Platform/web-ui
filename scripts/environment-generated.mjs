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

/*
 * Writes the two gitignored environment files from the tracked environment.ts,
 * the production one the same way build/Dockerfile does. Both builds swap one of
 * them in through fileReplacements, so a copy that lacks newer keys fails the
 * build with one error per use of every key added since - and never names the
 * file it is missing them from. Both are written on either run, because both are
 * generated and a stale one is the whole problem.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const tracked = readFileSync('src/environments/environment.ts', 'utf8');
if (!tracked.includes('production: false')) {
    throw new Error('src/environments/environment.ts no longer contains "production: false"; update scripts/environment-generated.mjs and build/Dockerfile together');
}
writeFileSync('src/environments/environment.dev.ts', tracked);
writeFileSync('src/environments/environment.prod.ts', tracked.replace('production: false', 'production: true'));
