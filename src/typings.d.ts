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

/* SystemJS module definition */
declare var module: NodeModule;
declare module 'bpmn-js/dist/bpmn-modeler.production.min.js'
declare module 'bpmn-js-properties-panel'
declare module 'bpmn-js-properties-panel/lib/provider/camunda';
declare module 'bpmn-js-properties-panel/lib/provider/camunda/element-templates';
declare module 'bpmn-js-properties-panel/lib/factory/EntryFactory';
declare module 'bpmn-js/lib/features/palette/PaletteProvider';
declare module 'camunda-bpmn-moddle/resources/camunda.json';
declare module 'senergy-properties-provider'

interface NodeModule {
    id: string;
}