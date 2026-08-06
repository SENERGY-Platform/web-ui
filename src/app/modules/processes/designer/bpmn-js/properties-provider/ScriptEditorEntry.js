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
 * The camunda properties panel renders every script as a textarea a few lines tall,
 * which is awkward for anything longer than a one-line condition. This adds a button
 * that opens the same script in a real editor.
 *
 * The panel's own textarea is left exactly as it was, fully editable -- the editor is
 * an extra way in, not a replacement. It is also the write path: setting its value
 * and firing a 'change' event hands the new script to the panel's own handler, which
 * persists it through camunda's validated set(). That avoids reimplementing where
 * each of the three sites stores its script -- a condition keeps it on a
 * bpmn:FormalExpression, a script task on the task itself, a listener on a
 * camunda:Script.
 *
 * All three sites come from the same helper (parts/implementation/Script.js), so they
 * are handled identically -- only the id and whether the row is conditionally shown
 * differ.
 */

/*
 * Keyed by the entry ids the camunda provider gives its script entries.
 * showWhen names an existing predicate on the entry, used as the row's data-show so
 * the button only appears when the script field itself does.
 */
const scriptEntries = {
    // parts/ConditionalProps.js -- sequence flow conditions and conditional events
    condition: { showWhen: 'isScript' },
    // parts/ScriptTaskProps.js -- bpmn:ScriptTask
    'script-implementation': {},
    // parts/ListenerDetailProps.js -- execution and task listeners
    'listener-script-value': {},
};

/**
 * Walks the tabs the camunda provider produced and augments every script entry.
 * Returns the same tabs, mutated, so it can be dropped into a getTabs() chain.
 */
export function augmentScriptEntries(tabs, bpmnjs) {
    (tabs || []).forEach(function (tab) {
        (tab.groups || []).forEach(function (group) {
            (group.entries || []).forEach(function (entry) {
                const options = entry && Object.prototype.hasOwnProperty.call(scriptEntries, entry.id) ? scriptEntries[entry.id] : null;
                if (options && !entry.senergyScriptEditor) {
                    augmentScriptEntry(entry, options, bpmnjs);
                }
            });
        });
    });
    return tabs;
}

function augmentScriptEntry(entry, options, bpmnjs) {
    entry.senergyScriptEditor = true;

    const dataShow = options.showWhen ? ' data-show="' + options.showWhen + '"' : '';
    entry.html =
        '<div class="senergy-script-entry">' +
        entry.html +
        '<div class="bpp-row"' + dataShow + '>' +
        '<button class="bpmn-iot-button" data-action="openScriptEditor">Open in Editor</button>' +
        '</div>' +
        '</div>';

    entry.openScriptEditor = function (element, node) {
        const editScript = bpmnjs.designerCallbacks && bpmnjs.designerCallbacks.editScript;
        if (!editScript) {
            console.log('missing bpmnjs.designerCallbacks.editScript()');
            return;
        }

        const scriptField = node.querySelector('textarea[name=scriptValue]');
        if (!scriptField) {
            console.log('unable to find the script field of entry', entry.id);
            return;
        }
        const formatField = node.querySelector('input[name=scriptFormat]');

        editScript(
            {
                script: scriptField.value || '',
                scriptFormat: formatField ? formatField.value || '' : '',
                label: (element.businessObject && element.businessObject.name) || '',
            },
            // the element is what the process flow analysis walks to work out which
            // variables exist at this point
            element,
            function (result) {
                scriptField.value = result.script;

                // Hands the value to the panel's own change handler, which runs the
                // camunda set() for this entry. Must bubble: the panel listens on
                // its container, not on the field.
                scriptField.dispatchEvent(new Event('change', { bubbles: true }));
            },
        );

        // Nothing to apply yet -- the dialog is asynchronous, and the change event
        // fired in the callback is what marks the entry dirty.
        return false;
    };
}
