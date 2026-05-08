import { describe, it, expect } from 'vitest';

// ── Campaign data-model helpers (pure functions extracted for testing) ─────────

function dateProg(startDate, endDate) {
  if (!startDate || !endDate) return { pct: 0, daysLeft: null };
  const now   = new Date();
  const start = new Date(startDate + 'T00:00');
  const end   = new Date(endDate   + 'T00:00');
  const total = end - start;
  if (total <= 0) return { pct: 100, daysLeft: 0 };
  const elapsed = Math.min(Math.max(now - start, 0), total);
  const pct      = Math.round((elapsed / total) * 100);
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { pct, daysLeft };
}

function fmtBudget(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

// ── dateProg ─────────────────────────────────────────────────────────────────
describe('dateProg()', () => {
  it('returns 0% and null when dates missing', () => {
    expect(dateProg(null, null)).toEqual({ pct: 0, daysLeft: null });
    expect(dateProg('', '')).toEqual({ pct: 0, daysLeft: null });
  });

  it('returns 100% when start === end', () => {
    const today = new Date().toISOString().slice(0, 10);
    const { pct } = dateProg(today, today);
    expect(pct).toBe(100);
  });

  it('returns 0% for a campaign starting in the future', () => {
    const { pct } = dateProg('2099-01-01', '2099-12-31');
    expect(pct).toBe(0);
  });

  it('returns 100% for a campaign already ended', () => {
    const { pct } = dateProg('2020-01-01', '2020-12-31');
    expect(pct).toBe(100);
  });

  it('pct is between 0 and 100', () => {
    const { pct } = dateProg('2025-01-01', '2099-12-31');
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it('daysLeft is negative for past campaigns', () => {
    const { daysLeft } = dateProg('2020-01-01', '2020-12-31');
    expect(daysLeft).toBeLessThan(0);
  });

  it('daysLeft is positive for future campaigns', () => {
    const { daysLeft } = dateProg('2099-01-01', '2099-12-31');
    expect(daysLeft).toBeGreaterThan(0);
  });
});

// ── fmtBudget ────────────────────────────────────────────────────────────────
describe('fmtBudget()', () => {
  it('formats EUR amounts in German locale', () => {
    const result = fmtBudget(5000, 'EUR');
    expect(result).toMatch(/5\.000/);   // German thousand separator
    expect(result).toMatch(/€/);
  });

  it('formats USD amounts', () => {
    const result = fmtBudget(1250.50, 'USD');
    expect(result).toMatch(/1\.250/);
  });

  it('handles zero', () => {
    expect(fmtBudget(0, 'EUR')).toMatch(/0/);
  });

  it('defaults to EUR', () => {
    expect(fmtBudget(100)).toMatch(/€/);
  });
});

// ── Campaign status transitions ───────────────────────────────────────────────
describe('Campaign status lifecycle', () => {
  const STATUS_TRANSITIONS = {
    draft:     ['planned'],
    planned:   ['active', 'draft'],
    active:    ['paused', 'completed'],
    paused:    ['active', 'completed'],
    completed: ['archived'],
    archived:  [],
  };

  it('draft can move to planned', () => {
    expect(STATUS_TRANSITIONS.draft).toContain('planned');
  });

  it('active can be paused or completed', () => {
    expect(STATUS_TRANSITIONS.active).toContain('paused');
    expect(STATUS_TRANSITIONS.active).toContain('completed');
  });

  it('archived has no further transitions', () => {
    expect(STATUS_TRANSITIONS.archived).toHaveLength(0);
  });

  it('completed cannot go back to active', () => {
    expect(STATUS_TRANSITIONS.completed).not.toContain('active');
  });

  it('all transition targets are valid statuses', () => {
    const validStatuses = Object.keys(STATUS_TRANSITIONS);
    Object.values(STATUS_TRANSITIONS).flat().forEach(target => {
      expect(validStatuses).toContain(target);
    });
  });
});
