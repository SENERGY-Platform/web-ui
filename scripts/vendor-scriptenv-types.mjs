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
 * Vendors the smart-service script environment declarations, which are generated
 * upstream by `go generate ./...`:
 *
 *   npm run vendor:scriptenv-types -- ../smart-service-module-worker-lib/doc/script-env.d.ts
 *
 * The declarations are wrapped in a string rather than kept as a .d.ts because the
 * editor hands them to monaco as an extra lib at runtime, and because a .d.ts under
 * src/ would be picked up by tsconfig and make Aspect, Device and friends ambient
 * types for the whole application.
 */

import fs from 'fs';

const [, , source, destination] = process.argv;
if (!source || !destination) {
    console.error('usage: vendor-scriptenv-types.mjs <path-to/script-env.d.ts> <destination.ts>');
    process.exit(1);
}

const declarations = fs.readFileSync(source, 'utf8').trimEnd();
const escaped = declarations.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const header = `/*
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
 * VENDORED -- do not edit by hand. This is doc/script-env.d.ts of
 * github.com/SENERGY-Platform/smart-service-module-worker-lib, where it is generated
 * from the go source by \`go generate ./...\`, wrapped as a string.
 *
 * Refresh with:
 *
 *   npm run vendor:scriptenv-types -- <path-to>/doc/script-env.d.ts \\
 *     ${destination}
 */
`;

fs.writeFileSync(
    destination,
    `${header}\n/** Declarations handed to the code editor as a TypeScript extra lib. */\nexport const smartServiceScriptEnvTypes = \`\n${escaped}\n\`;\n`,
);
console.error(`vendored ${declarations.split('\n').length} lines from ${source}`);
