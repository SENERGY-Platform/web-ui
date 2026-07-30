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

import { reportFileName } from './report-file-name';

describe('reportFileName', () => {
    it('should append the type as extension', () => {
        expect(reportFileName('monthly report', 'pdf')).toBe('monthly_report.pdf');
    });

    it('should accept a type that already contains a dot', () => {
        expect(reportFileName('report', '.PDF')).toBe('report.pdf');
    });

    it('should ignore types that are no file extension', () => {
        expect(reportFileName('report', 'spreadsheet template')).toBe('report');
        expect(reportFileName('report', undefined)).toBe('report');
    });

    it('should fall back to a generic name', () => {
        expect(reportFileName('', 'pdf')).toBe('report.pdf');
    });

    it('should keep characters that are safe in file names', () => {
        expect(reportFileName('report-2026.01_v2', 'csv')).toBe('report-2026.01_v2.csv');
    });

    it('should replace path separators', () => {
        expect(reportFileName('../etc/passwd', 'pdf')).toBe('.._etc_passwd.pdf');
    });
});
