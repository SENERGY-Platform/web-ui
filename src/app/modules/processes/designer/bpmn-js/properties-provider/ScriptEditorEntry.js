/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * The camunda properties panel renders every script as a small textarea, awkward for anything
 * longer than a one-line condition. This adds a button under the panel's own (still editable)
 * field that opens the same script in the designer's editor.
 *
 * The edited script is written the way the panel's field writes it: one
 * element.updateModdleProperties on the moddle element that holds the script, so it is undoable
 * and goes through the same command as typing would.
 */

import { Fragment, h } from '@bpmn-io/properties-panel/preact';
import { useService } from 'bpmn-js-properties-panel';
import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';

/*
 * Where an entry's script lives. Covers the three sites the designers always offered the editor
 * for: conditions, script tasks and listener scripts (not input/output parameter scripts).
 */
function scriptSite(entry) {
    if (entry.id === 'conditionScriptValue') {
        return function (element) {
            var bo = getBusinessObject(element);
            var expression = is(bo, 'bpmn:SequenceFlow')
                ? bo.get('conditionExpression')
                : bo.get('eventDefinitions').find(function (definition) {
                    return is(definition, 'bpmn:ConditionalEventDefinition');
                }).get('condition');
            return { moddleElement: expression, property: 'body', scriptFormat: expression.get('language') };
        };
    }
    if (entry.id === 'scriptValue' && !entry.script) {
        return function (element) {
            var bo = getBusinessObject(element);
            return { moddleElement: bo, property: 'script', scriptFormat: bo.get('scriptFormat') };
        };
    }
    if (entry.script && /-(executionListener|taskListener)-\d+-?scriptValue$/.test(entry.id)) {
        var script = entry.script;
        return function () {
            return { moddleElement: script, property: 'value', scriptFormat: script.get('scriptFormat') };
        };
    }
    return null;
}

function ScriptEntryWithEditor(props) {
    var Original = props.senergyScriptComponent;
    var bpmnjs = useService('bpmnjs');
    var commandStack = useService('commandStack');

    var open = function () {
        var editScript = bpmnjs.designerCallbacks && bpmnjs.designerCallbacks.editScript;
        if (!editScript) {
            console.log('missing bpmnjs.designerCallbacks.editScript()');
            return;
        }
        var element = props.element;
        var site = props.senergyScriptSite(element);
        editScript(
            {
                script: site.moddleElement.get(site.property) || '',
                scriptFormat: site.scriptFormat || '',
                label: (element.businessObject && element.businessObject.name) || '',
            },
            // the element is what the process flow analysis walks to work out which variables exist here
            element,
            function (result) {
                commandStack.execute('element.updateModdleProperties', {
                    element: element,
                    moddleElement: site.moddleElement,
                    properties: { [site.property]: result.script || '' },
                });
            },
        );
    };

    return h(Fragment, null,
        h(Original, props),
        h('div', { class: 'bio-properties-panel-entry senergy-script-entry' },
            h('button', { type: 'button', class: 'bpmn-iot-button', onClick: open }, 'Open in Editor')));
}

function augmentEntries(entries) {
    (entries || []).forEach(function (entry) {
        if (entry.component === ScriptEntryWithEditor) {
            return;
        }
        var site = scriptSite(entry);
        if (site) {
            entry.senergyScriptComponent = entry.component;
            entry.senergyScriptSite = site;
            entry.component = ScriptEntryWithEditor;
        }
    });
}

/** Gives every script entry of the groups the editor button; returns the same groups. */
export function augmentScriptEntries(groups) {
    (groups || []).forEach(function (group) {
        augmentEntries(group.entries);
        (group.items || []).forEach(function (item) {
            augmentEntries(item.entries);
        });
    });
    return groups;
}
