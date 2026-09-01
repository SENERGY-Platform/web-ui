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

import { smartServiceLogsUrl } from './opensearch';

const dashboards = 'http://opensearch-dashboards.logging.svc.cluster.local:5601';
const index = 'ec921b50-dee5-11ef-8100-013c2bb6d2ff';
const instance = '383288d7-3f9b-4bc6-af33-532915e07c45';

describe('smartServiceLogsUrl', () => {
    it('builds the discover link the logging setup expects', () => {
        expect(smartServiceLogsUrl(dashboards, index, instance)).toBe(
            'http://opensearch-dashboards.logging.svc.cluster.local:5601/app/discover#/?' +
                '_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))' +
                '&_a=(columns:!(_source),filters:!((\'$state\':(store:appState),' +
                'meta:(alias:!n,disabled:!f,index:ec921b50-dee5-11ef-8100-013c2bb6d2ff,' +
                'key:smart_service_instance_id.keyword,negate:!f,' +
                'params:(query:\'383288d7-3f9b-4bc6-af33-532915e07c45\'),type:phrase),' +
                'query:(match_phrase:(smart_service_instance_id.keyword:' +
                '\'383288d7-3f9b-4bc6-af33-532915e07c45\')))),' +
                'index:ec921b50-dee5-11ef-8100-013c2bb6d2ff,interval:auto,' +
                'query:(language:kuery,query:\'\'),sort:!())',
        );
    });

    it('names the instance in both the filter meta and the query it renders to', () => {
        const url = smartServiceLogsUrl(dashboards, index, instance);
        expect(url.split(instance).length - 1).toBe(2);
        expect(url.split(index).length - 1).toBe(2);
    });

    it('offers no link while the deployment has not configured OpenSearch', () => {
        expect(smartServiceLogsUrl('', index, instance)).toBe('');
        expect(smartServiceLogsUrl(dashboards, '', instance)).toBe('');
        expect(smartServiceLogsUrl(dashboards, index, '')).toBe('');
    });

    it('does not double the separator when the configured url ends in one', () => {
        expect(smartServiceLogsUrl(dashboards + '/', index, instance)).toContain(':5601/app/discover');
    });

    // rison is not form encoding: a quote inside a quoted string is escaped with ! and would
    // otherwise end the string early and leave the rest of the link unparseable
    it('escapes a quote in the instance id rather than letting it close the string', () => {
        expect(smartServiceLogsUrl(dashboards, index, "a'b")).toContain("params:(query:'a!'b')");
    });

    it('escapes the rison escape character itself', () => {
        expect(smartServiceLogsUrl(dashboards, index, 'a!b')).toContain("params:(query:'a!!b')");
    });

    it('keeps anything meaningful in rison out of the unquoted index pattern', () => {
        expect(smartServiceLogsUrl(dashboards, "abc,index:'x", instance)).toContain('index:abcindexx,');
    });
});
