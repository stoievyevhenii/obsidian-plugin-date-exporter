import { describe, expect, it } from 'vitest';
import { getDefaultDateRange } from '../src/core';

describe('monthly default range from the local device calendar', () => {
  it.each([1, 2, 3, 4, 5, 6, 7])('selects the full previous month on day %s', day => {
    expect(getDefaultDateRange(new Date(2026, 9, day, 0, 30)))
      .toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });
  it.each([8, 9, 15, 25, 30, 31])('selects the full current month on day %s', day => {
    expect(getDefaultDateRange(new Date(2026, 9, day, 23, 30)))
      .toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });
  it.each([
    [2026, 1, 1, '2025-12-01', '2025-12-31'],
    [2026, 1, 7, '2025-12-01', '2025-12-31'],
    [2026, 1, 8, '2026-01-01', '2026-01-31'],
    [2028, 3, 7, '2028-02-01', '2028-02-29'],
    [2026, 3, 7, '2026-02-01', '2026-02-28'],
    [2028, 2, 8, '2028-02-01', '2028-02-29'],
    [2026, 2, 8, '2026-02-01', '2026-02-28'],
    [2100, 3, 7, '2100-02-01', '2100-02-28'],
    [2000, 3, 7, '2000-02-01', '2000-02-29'],
    [2026, 4, 8, '2026-04-01', '2026-04-30'],
  ])('handles calendar boundary %s-%s-%s', (year, month, day, start, end) => {
    expect(getDefaultDateRange(new Date(year as number, (month as number) - 1, day as number, 12)))
      .toEqual({ start, end });
  });
});
