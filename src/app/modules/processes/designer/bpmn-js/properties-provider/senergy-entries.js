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
 * Properties panel entries of the Senergy groups. preact comes from the panel's own bundled
 * copy: a second preact instance would break its hooks.
 */

import { h } from '@bpmn-io/properties-panel/preact';
import { useCallback, useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { isSelectEntryEdited, isTextAreaEntryEdited, SelectEntry, useDebounce, useShowEntryEvent } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

function ButtonEntry(props) {
    const { element, id, label, buttonClass, onClick } = props;
    return h('div', { class: 'bio-properties-panel-entry senergy-button-entry', 'data-entry-id': id },
        h('button', { type: 'button', class: buttonClass, onClick: () => onClick(element) }, label));
}

/** A button that opens a designer dialog; onClick receives the selected element. */
export function buttonEntry(id, label, onClick, buttonClass = 'bpmn-iot-button') {
    return { id, component: ButtonEntry, label, onClick, buttonClass };
}

function HtmlEntry(props) {
    const { id, html } = props;
    return h('div', { class: 'bio-properties-panel-entry senergy-html-entry', 'data-entry-id': id, dangerouslySetInnerHTML: { __html: html } });
}

/** Markup the designer builds itself, shown as it is. */
export function htmlEntry(id, html) {
    return { id, component: HtmlEntry, html };
}

/** An emptied field removes the attribute instead of writing an empty one. */
function setAttribute(modeling, element, property, value) {
    modeling.updateProperties(element, { [property]: value === '' ? undefined : value });
}

/*
 * Built on the panel's primitives instead of TextAreaEntry, which trims on blur and paste: the
 * designers always wrote these attributes exactly as typed.
 */
function AttributeTextEntry(props) {
    const { element, id, label, property } = props;
    const modeling = useService('modeling');
    const debounceInput = useService('debounceInput');
    const value = getBusinessObject(element).get(property) || '';
    const [localValue, setLocalValue] = useState(value);
    const ref = useShowEntryEvent(id);

    const commit = useCallback((newValue) => setAttribute(modeling, element, property, newValue), [modeling, element, property]);
    const handleInput = useDebounce(commit, debounceInput);

    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    const onInput = (event) => {
        if (event.target.value === localValue) {
            return;
        }
        setLocalValue(event.target.value);
        handleInput(event.target.value);
    };
    // commit at once when leaving the field or using a shortcut, as the panel's own fields do
    const flush = () => handleInput.flush && handleInput.flush();
    const onKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.length === 1) {
            flush();
        }
    };

    const inputId = 'bio-properties-panel-' + id;
    return h('div', { class: 'bio-properties-panel-entry', 'data-entry-id': id },
        h('div', { class: 'bio-properties-panel-textarea' },
            h('label', { for: inputId, class: 'bio-properties-panel-label' }, label),
            h('div', { class: 'bio-properties-panel-textarea-container' },
                h('textarea', {
                    ref,
                    id: inputId,
                    name: id,
                    spellCheck: 'false',
                    class: 'bio-properties-panel-input auto-resize',
                    rows: 1,
                    value: localValue,
                    onInput,
                    onBlur: flush,
                    onKeyDown,
                }))));
}

/** A text field for an attribute of the element, such as senergy:description. */
export function attributeTextEntry(id, label, property) {
    return { id, component: AttributeTextEntry, label, property, isEdited: isTextAreaEntryEdited };
}

function AttributeSelectEntry(props) {
    const { element, id, label, property, options } = props;
    const modeling = useService('modeling');
    return SelectEntry({
        element,
        id,
        label,
        getValue: () => getBusinessObject(element).get(property),
        setValue: (value) => setAttribute(modeling, element, property, value),
        getOptions: () => options,
    });
}

/** A select for an attribute of the element; options are {value, label}. */
export function attributeSelectEntry(id, label, property, options) {
    return { id, component: AttributeSelectEntry, label, property, options, isEdited: isSelectEntryEdited };
}
