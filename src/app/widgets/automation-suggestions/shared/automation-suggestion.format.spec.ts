import { HttpErrorResponse } from '@angular/common/http';
import { describeError, formatActiveState, formatAutoOff, formatStats, formatSuggestionSubtitle, formatWeekdays, formatWindow } from './automation-suggestion.format';

describe('automation suggestion format', () => {
    it('names the weekdays, with Monday as 0', () => {
        expect(formatWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe('every day');
        expect(formatWeekdays([4, 3, 2, 1, 0])).toBe('Mon–Fri');
        expect(formatWeekdays([5, 6])).toBe('Sat–Sun');
        expect(formatWeekdays([2, 0])).toBe('Mon, Wed');
    });

    it('formats the window as time range and weekdays, without the time zone', () => {
        expect(formatWindow({ from: '19:00', to: '02:00', weekdays: [0, 1, 2, 3, 4, 5, 6], tz: 'Europe/Berlin' }))
            .toBe('19:00–02:00 · every day');
        expect(formatWindow({ from: '19:00', to: '02:00', weekdays: [], tz: 'Europe/Berlin' })).toBe('19:00–02:00');
    });

    it('formats the statistics as the share of triggers that are followed', () => {
        expect(formatStats({ occurrences: 100, hits: 31, confidence: 0.31, baseline: 0.05, lift: 6.2, median_delay_s: 25 }))
            .toBe('follows in 31 % of 100 triggers');
    });

    it('puts the window and the statistics into the subtitle of a suggestion', () => {
        expect(formatSuggestionSubtitle({
            id: 'sug-1',
            trigger: { device_id: 'd', service_id: 's', path: 'value.state', kind: 'binary', from: null, to: 'off' },
            window: { from: '19:00', to: '02:00', weekdays: [0, 1, 2, 3, 4], tz: 'Europe/Berlin' },
            targets: [],
            auto_off_s: null,
            stats: { occurrences: 291, hits: 90, confidence: 0.31, baseline: 0.05, lift: 6.2, median_delay_s: 25 },
        })).toBe('19:00–02:00 · Mon–Fri · follows in 31 % of 291 triggers');
    });

    it('formats the auto off only when it is set', () => {
        expect(formatAutoOff(null)).toBeNull();
        expect(formatAutoOff(120)).toBe('switched back after 120 s');
    });

    it('names the state of an accepted automation with the delay the module has', () => {
        expect(formatActiveState(180)).toBe('Active · off after 180 s');
        expect(formatActiveState(null)).toBe('Active · no auto-off');
        expect(formatActiveState(undefined)).toBe('Active');
    });

    it('names a 403 from the automation engine and keeps the fallback for other errors', () => {
        const forbidden = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
        expect(describeError(forbidden, 'fallback')).toContain('403');
        const server = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
        expect(describeError(server, 'fallback')).toBe('fallback');
        expect(describeError(new Error('x'), 'fallback')).toBe('fallback');
    });
});
