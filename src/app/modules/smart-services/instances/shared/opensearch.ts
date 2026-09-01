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

/**
 * A Discover link showing the log lines of one smart service instance.
 *
 * The state of a Discover view travels in the fragment as rison, which is not json and not form
 * encoding: `!`, `(`, `'` and `:` carry meaning there and must stay as they are, so the parts that are
 * filled in are escaped on their own rather than the url as a whole. Both the index pattern and the
 * instance id appear twice, once in the filter's meta and once in the query it renders to.
 *
 * Empty when the deployment did not configure OpenSearch; the caller then offers no link.
 */
export function smartServiceLogsUrl(dashboardsUrl: string, indexPatternId: string, instanceId: string): string {
    if (!dashboardsUrl || !indexPatternId || !instanceId) {
        return '';
    }
    const index = risonString(indexPatternId);
    const id = risonQuoted(instanceId);
    const base = dashboardsUrl.replace(/\/+$/, '');
    const global = '(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))';
    const filter =
        "('$state':(store:appState)," +
        `meta:(alias:!n,disabled:!f,index:${index},key:smart_service_instance_id.keyword,negate:!f,params:(query:${id}),type:phrase),` +
        `query:(match_phrase:(smart_service_instance_id.keyword:${id})))`;
    const app =
        `(columns:!(_source),filters:!(${filter}),index:${index},interval:auto,query:(language:kuery,query:''),sort:!())`;
    return `${base}/app/discover#/?_g=${global}&_a=${app}`;
}

/** A rison string that carries no quotes of its own, so anything meaningful in rison has to go */
function risonString(value: string): string {
    return value.replace(/[^A-Za-z0-9_.-]/g, '');
}

/** A quoted rison string; inside one only the quote and rison's own escape character, !, need escaping */
function risonQuoted(value: string): string {
    return `'${value.replace(/[!']/g, (match) => '!' + match)}'`;
}
