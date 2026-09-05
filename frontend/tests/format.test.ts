import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from '@/lib/format';

describe('formatMoney', () => {
  it('renders naira amounts with two decimals', () => {
    expect(formatMoney(2500.5)).toMatch(/2,500\.50/);
  });

  it('accepts a numeric string from the API', () => {
    expect(formatMoney('1500' as unknown as number)).toMatch(/1,500/);
  });

  it('honours a different currency', () => {
    expect(formatMoney(10, 'USD')).toMatch(/10/);
  });
});

describe('formatDate', () => {
  it('formats an ISO timestamp', () => {
    expect(formatDate('2026-01-15T10:30:00Z')).toMatch(/2026/);
  });
});
