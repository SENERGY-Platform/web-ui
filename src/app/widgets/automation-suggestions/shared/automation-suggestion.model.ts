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

/** Name of the release whose instances the widget can show. */
export const AUTOMATION_SUGGESTIONS_RELEASE_NAME = 'Automatisierungsvorschläge';

/** Export module type that holds the suggestion list. */
export const AUTOMATION_SUGGESTIONS_EXPORT_MODULE_TYPE = 'export';

/** Column of the export that holds the suggestion document as JSON string. */
export const AUTOMATION_SUGGESTIONS_EXPORT_COLUMN = 'suggestions';

/** Module type of deployed processes; accepted suggestions are modules of this type. */
export const PROCESS_DEPLOYMENT_MODULE_TYPE = 'process_deployment';

/** Module key prefix of an accepted suggestion, followed by the suggestion id. */
export const SUGGESTION_MODULE_KEY_PREFIX = 'suggestion:';

/** Process-io key prefix of a dismissed suggestion, followed by the suggestion id. */
export const DISMISSED_SUGGESTION_KEY_PREFIX = 'automation-suggester.dismissed.';

/** Maintenance procedure that accepts a suggestion. */
export const ACCEPT_SUGGESTION_PROCEDURE = 'accept_suggestion';

export const SET_DEVICE_ON_FUNCTION_ID = 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9';
export const SET_DEVICE_OFF_FUNCTION_ID = 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd';
export const CONTROLLING_FUNCTION_RDF_TYPE = 'https://senergy.infai.org/ontology/ControllingFunction';

/** Allowed delay of the automatic switch-off in whole seconds. The engine rejects less than 5 s. */
export const AUTO_OFF_MIN_S = 5;
export const AUTO_OFF_MAX_S = 3600;

/** Interval of the reloads that wait for the module to show an accepted or edited automation. */
export const CONFIRM_POLL_MS = 2000;
/** Time after which such a wait ends, with the last view shown. */
export const CONFIRM_TIMEOUT_MS = 30000;

export type SuggestionTriggerKind = 'binary' | 'contact' | 'button' | 'position' | 'power';

/** The event that starts an automation: a state change of one value path on one device. */
export interface SuggestionTrigger {
    device_id: string;
    service_id: string;
    path: string;
    kind: SuggestionTriggerKind;
    /** null for button and position triggers, which only wait for `to`; always `off` or `on` for power triggers */
    from: string | null;
    /** the state the trigger switches to, e.g. `on`, `off`, `open`, `closed`, `up`, `down` or the button text */
    to: string;
    /** power triggers only: the power above which the device counts as on, in W */
    on_above_w?: number;
    /** power triggers only: the power below which the device counts as off, in W */
    off_below_w?: number;
    /** power triggers only: seconds a new state must hold before the switch counts */
    hold_s?: number;
}

export interface SuggestionWindow {
    from: string;
    to: string;
    /** 0 = Monday, 6 = Sunday (Python weekday numbering; the export contract does not name the origin) */
    weekdays: number[];
    tz: string;
}

/** One device value the automation sets when the trigger fires. */
export interface SuggestionTarget {
    device_id: string;
    service_id: string;
    /** the measured value path on the target's service, the command is resolved from its concept */
    path: string;
    /** always null in the export; the web-ui resolves the controlling function from the device type */
    function_id: string | null;
    value: boolean | number | string;
}

export interface SuggestionStats {
    occurrences: number;
    hits: number;
    confidence: number;
    baseline: number;
    lift: number;
    median_delay_s: number;
}

export interface AutomationSuggestion {
    id: string;
    trigger: SuggestionTrigger;
    window: SuggestionWindow;
    targets: SuggestionTarget[];
    /** seconds after which the targets with a binary value are switched back; null if not set */
    auto_off_s: number | null;
    stats: SuggestionStats;
}

/** Widget properties of this widget type. Stored under `automationSuggestions` in the widget properties. */
export interface AutomationSuggestionsConfig {
    instanceId: string;
}

export interface AutomationSuggestionsPropertiesModel {
    automationSuggestions?: AutomationSuggestionsConfig;
}

export function suggestionInstanceId(properties: object): string | undefined {
    return (properties as AutomationSuggestionsPropertiesModel).automationSuggestions?.instanceId;
}

export function setSuggestionInstanceId(properties: object, instanceId: string): void {
    (properties as AutomationSuggestionsPropertiesModel).automationSuggestions = { instanceId };
}

export function moduleKeyForSuggestion(suggestionId: string): string {
    return SUGGESTION_MODULE_KEY_PREFIX + suggestionId;
}

export function dismissedKeyForSuggestion(suggestionId: string): string {
    return DISMISSED_SUGGESTION_KEY_PREFIX + suggestionId;
}

/** The delay as typed by the user: whole seconds from 5 to 3600, null for anything else, decimals included. */
export function parseAutoOffSeconds(text: string): number | null {
    if (!/^\d+$/.test(text)) {
        return null;
    }
    const seconds = Number(text);
    return seconds >= AUTO_OFF_MIN_S && seconds <= AUTO_OFF_MAX_S ? seconds : null;
}

/** A switch-off as the user set it: on or off, and the delay as typed. */
export interface AutoOffChoice {
    enabled: boolean;
    seconds: string;
}
