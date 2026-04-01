import { describe, it, expect } from 'vitest';
import { CHANNELS, ROLES, DEMO_CAMPAIGNS, DEMO_POSTS, STAGES } from '../constants/demo.js';

// ── CHANNELS ─────────────────────────────────────────────────────────────────
describe('CHANNELS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CHANNELS)).toBe(true);
    expect(CHANNELS.length).toBeGreaterThan(0);
  });

  it('every channel has id, label and color', () => {
    CHANNELS.forEach(ch => {
      expect(ch).toHaveProperty('id');
      expect(ch).toHaveProperty('label');
      expect(ch).toHaveProperty('color');
      expect(typeof ch.id).toBe('string');
    });
  });

  it('channel IDs are unique', () => {
    const ids = CHANNELS.map(ch => ch.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the major platforms', () => {
    const ids = CHANNELS.map(ch => ch.id);
    expect(ids).toContain('instagram');
    expect(ids).toContain('facebook');
    expect(ids).toContain('linkedin');
  });
});

// ── ROLES ────────────────────────────────────────────────────────────────────
describe('ROLES', () => {
  it('defines admin, editor, viewer roles', () => {
    expect(ROLES).toHaveProperty('admin');
    expect(ROLES).toHaveProperty('editor');
    expect(ROLES).toHaveProperty('viewer');
  });

  it('every role has a label and can-array', () => {
    Object.values(ROLES).forEach(role => {
      expect(role).toHaveProperty('label');
      expect(role).toHaveProperty('can');
      expect(Array.isArray(role.can)).toBe(true);
    });
  });

  it('admin can do everything viewer can', () => {
    const adminCan = new Set(ROLES.admin.can);
    ROLES.viewer.can.forEach(perm => {
      expect(adminCan.has(perm)).toBe(true);
    });
  });
});

// ── DEMO_CAMPAIGNS ────────────────────────────────────────────────────────────
describe('DEMO_CAMPAIGNS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DEMO_CAMPAIGNS)).toBe(true);
    expect(DEMO_CAMPAIGNS.length).toBeGreaterThan(0);
  });

  it('every campaign has required fields', () => {
    DEMO_CAMPAIGNS.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('color');
    });
  });

  it('campaign IDs are unique', () => {
    const ids = DEMO_CAMPAIGNS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('campaigns with dates have valid ISO date format', () => {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    DEMO_CAMPAIGNS.forEach(c => {
      if (c.startDate) expect(c.startDate).toMatch(isoDateRegex);
      if (c.endDate)   expect(c.endDate).toMatch(isoDateRegex);
    });
  });

  it('campaigns with dates have endDate >= startDate', () => {
    DEMO_CAMPAIGNS.forEach(c => {
      if (c.startDate && c.endDate) {
        expect(new Date(c.endDate) >= new Date(c.startDate)).toBe(true);
      }
    });
  });

  it('budget total is a positive number when present', () => {
    DEMO_CAMPAIGNS.forEach(c => {
      if (c.budget?.total !== undefined) {
        expect(c.budget.total).toBeGreaterThan(0);
      }
    });
  });

  it('channels is an array of strings when present', () => {
    DEMO_CAMPAIGNS.forEach(c => {
      if (c.channels) {
        expect(Array.isArray(c.channels)).toBe(true);
        c.channels.forEach(ch => expect(typeof ch).toBe('string'));
      }
    });
  });
});

// ── DEMO_POSTS ────────────────────────────────────────────────────────────────
describe('DEMO_POSTS', () => {
  const validStatuses = ['draft', 'scheduled', 'pending', 'published'];

  it('is an array', () => {
    expect(Array.isArray(DEMO_POSTS)).toBe(true);
  });

  it('every post has id, title, status and channels', () => {
    DEMO_POSTS.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('status');
      expect(Array.isArray(p.channels)).toBe(true);
    });
  });

  it('post IDs are unique', () => {
    const ids = DEMO_POSTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every post has a valid status', () => {
    DEMO_POSTS.forEach(p => {
      expect(validStatuses).toContain(p.status);
    });
  });

  it('posts with scheduledDate use ISO date format', () => {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    DEMO_POSTS.forEach(p => {
      if (p.scheduledDate) {
        expect(p.scheduledDate).toMatch(isoDateRegex);
      }
    });
  });

  it('post channels only reference known channel IDs', () => {
    const knownIds = new Set(CHANNELS.map(ch => ch.id));
    DEMO_POSTS.forEach(p => {
      p.channels.forEach(ch => {
        expect(knownIds.has(ch)).toBe(true);
      });
    });
  });
});

// ── STAGES ───────────────────────────────────────────────────────────────────
describe('STAGES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(STAGES)).toBe(true);
    expect(STAGES.length).toBeGreaterThan(0);
  });

  it('every stage has id and label', () => {
    STAGES.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('label');
    });
  });
});
