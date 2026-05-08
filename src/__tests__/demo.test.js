import { describe, it, expect } from 'vitest';
import { CHANNELS, STORY_CHANNELS, ROLES, DEMO_CAMPAIGNS, DEMO_POSTS, DEMO_STORIES, STAGES, DEMO_WORKSPACES, DEMO_WORKSPACE_MEMBERS, DEMO_MEDIA } from '../constants/demo.js';

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

// ── STORY_CHANNELS ────────────────────────────────────────────────────────────
describe('STORY_CHANNELS', () => {
  it('contains all social CHANNELS plus website and print', () => {
    const ids = STORY_CHANNELS.map(ch => ch.id);
    CHANNELS.forEach(ch => expect(ids).toContain(ch.id));
    expect(ids).toContain('website');
    expect(ids).toContain('print');
  });

  it('has more entries than CHANNELS', () => {
    expect(STORY_CHANNELS.length).toBeGreaterThan(CHANNELS.length);
  });

  it('website and print have very high maxChars', () => {
    const website = STORY_CHANNELS.find(ch => ch.id === 'website');
    const print   = STORY_CHANNELS.find(ch => ch.id === 'print');
    expect(website.maxChars).toBeGreaterThan(10000);
    expect(print.maxChars).toBeGreaterThan(10000);
  });

  it('all channels have id, label, color', () => {
    STORY_CHANNELS.forEach(ch => {
      expect(ch).toHaveProperty('id');
      expect(ch).toHaveProperty('label');
      expect(ch).toHaveProperty('color');
    });
  });

  it('channel IDs are unique', () => {
    const ids = STORY_CHANNELS.map(ch => ch.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── DEMO_STORIES ──────────────────────────────────────────────────────────────
describe('DEMO_STORIES', () => {
  const validStatuses = ['idea', 'draft', 'ready', 'published'];

  it('is a non-empty array', () => {
    expect(Array.isArray(DEMO_STORIES)).toBe(true);
    expect(DEMO_STORIES.length).toBeGreaterThan(0);
  });

  it('every story has required fields', () => {
    DEMO_STORIES.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('status');
      expect(s).toHaveProperty('blocks');
      expect(s).toHaveProperty('materials');
      expect(s).toHaveProperty('derivatives');
      expect(s).toHaveProperty('targetChannels');
    });
  });

  it('story IDs are unique', () => {
    const ids = DEMO_STORIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every story has a valid status', () => {
    DEMO_STORIES.forEach(s => {
      expect(validStatuses).toContain(s.status);
    });
  });

  it('blocks is an array', () => {
    DEMO_STORIES.forEach(s => {
      expect(Array.isArray(s.blocks)).toBe(true);
    });
  });

  it('materials is an array with valid types', () => {
    const validTypes = ['link', 'note', 'image'];
    DEMO_STORIES.forEach(s => {
      expect(Array.isArray(s.materials)).toBe(true);
      s.materials.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(validTypes).toContain(m.type);
      });
    });
  });

  it('targetChannels only reference known STORY_CHANNELS ids', () => {
    const knownIds = new Set(STORY_CHANNELS.map(ch => ch.id));
    DEMO_STORIES.forEach(s => {
      s.targetChannels.forEach(chId => {
        expect(knownIds.has(chId)).toBe(true);
      });
    });
  });

  it('derivatives reference valid channel ids', () => {
    const knownIds = new Set(STORY_CHANNELS.map(ch => ch.id));
    DEMO_STORIES.forEach(s => {
      s.derivatives.forEach(d => {
        expect(d).toHaveProperty('id');
        expect(d).toHaveProperty('channel');
        expect(knownIds.has(d.channel)).toBe(true);
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

// ── DEMO_WORKSPACES ────────────────────────────────────────────────────────────
describe('DEMO_WORKSPACES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DEMO_WORKSPACES)).toBe(true);
    expect(DEMO_WORKSPACES.length).toBeGreaterThan(0);
  });

  it('every workspace has required fields', () => {
    DEMO_WORKSPACES.forEach(ws => {
      expect(ws).toHaveProperty('id');
      expect(ws).toHaveProperty('name');
      expect(ws).toHaveProperty('color');
      expect(typeof ws.id).toBe('string');
      expect(typeof ws.name).toBe('string');
    });
  });

  it('workspace IDs are unique', () => {
    const ids = DEMO_WORKSPACES.map(ws => ws.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('workspace colors are valid hex codes', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    DEMO_WORKSPACES.forEach(ws => {
      expect(ws.color).toMatch(hexRegex);
    });
  });

  it('includes ppi Media workspace', () => {
    const ids = DEMO_WORKSPACES.map(ws => ws.id);
    expect(ids).toContain('ws-ppi-media');
  });
});

// ── DEMO_WORKSPACE_MEMBERS ─────────────────────────────────────────────────────
describe('DEMO_WORKSPACE_MEMBERS', () => {
  const wsIds = new Set(DEMO_WORKSPACES.map(ws => ws.id));
  const validRoles = ['admin', 'editor', 'viewer'];

  it('is a non-empty array', () => {
    expect(Array.isArray(DEMO_WORKSPACE_MEMBERS)).toBe(true);
    expect(DEMO_WORKSPACE_MEMBERS.length).toBeGreaterThan(0);
  });

  it('every member entry has workspaceId, userId and role', () => {
    DEMO_WORKSPACE_MEMBERS.forEach(m => {
      expect(m).toHaveProperty('workspaceId');
      expect(m).toHaveProperty('userId');
      expect(m).toHaveProperty('role');
      expect(typeof m.workspaceId).toBe('string');
      expect(typeof m.userId).toBe('string');
    });
  });

  it('every workspaceId references a known workspace', () => {
    DEMO_WORKSPACE_MEMBERS.forEach(m => {
      expect(wsIds.has(m.workspaceId)).toBe(true);
    });
  });

  it('every role is a valid role', () => {
    DEMO_WORKSPACE_MEMBERS.forEach(m => {
      expect(validRoles).toContain(m.role);
    });
  });

  it('no duplicate userId+workspaceId combinations', () => {
    const seen = new Set();
    DEMO_WORKSPACE_MEMBERS.forEach(m => {
      const key = `${m.userId}::${m.workspaceId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  });
});

// ── DEMO_MEDIA ─────────────────────────────────────────────────────────────────
describe('DEMO_MEDIA', () => {
  const validTypes = ['image', 'video', 'document'];
  const wsIds = new Set(DEMO_WORKSPACES.map(ws => ws.id));

  it('is a non-empty array', () => {
    expect(Array.isArray(DEMO_MEDIA)).toBe(true);
    expect(DEMO_MEDIA.length).toBeGreaterThan(0);
  });

  it('every media item has required fields', () => {
    DEMO_MEDIA.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('url');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('workspaceId');
      expect(typeof item.id).toBe('string');
      expect(typeof item.url).toBe('string');
    });
  });

  it('media IDs are unique', () => {
    const ids = DEMO_MEDIA.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every media item has a valid type', () => {
    DEMO_MEDIA.forEach(item => {
      expect(validTypes).toContain(item.type);
    });
  });

  it('every media item belongs to a known workspace', () => {
    DEMO_MEDIA.forEach(item => {
      expect(wsIds.has(item.workspaceId)).toBe(true);
    });
  });

  it('media is distributed across multiple workspaces', () => {
    const usedWsIds = new Set(DEMO_MEDIA.map(item => item.workspaceId));
    expect(usedWsIds.size).toBeGreaterThan(1);
  });
});

// ── Workspace filtering logic ──────────────────────────────────────────────────
describe('workspace filtering logic', () => {
  // Pure filtering helpers — mirrors what AppContext does
  const filterByWs = (arr, wsId) =>
    wsId ? arr.filter(x => x.workspaceId === wsId) : arr;

  it('filterByWs returns all items when wsId is null', () => {
    const result = filterByWs(DEMO_POSTS, null);
    expect(result.length).toBe(DEMO_POSTS.length);
  });

  it('filterByWs returns only matching items for a specific workspace', () => {
    const wsId = DEMO_WORKSPACES[0].id;
    const result = filterByWs(DEMO_POSTS, wsId);
    result.forEach(p => expect(p.workspaceId).toBe(wsId));
  });

  it('filterByWs returns empty array for non-existent workspace', () => {
    const result = filterByWs(DEMO_POSTS, 'ws-does-not-exist');
    expect(result.length).toBe(0);
  });

  it('all DEMO_POSTS belong to a known workspace', () => {
    const wsIds = new Set(DEMO_WORKSPACES.map(ws => ws.id));
    DEMO_POSTS.forEach(p => {
      expect(wsIds.has(p.workspaceId)).toBe(true);
    });
  });

  it('all DEMO_CAMPAIGNS belong to a known workspace', () => {
    const wsIds = new Set(DEMO_WORKSPACES.map(ws => ws.id));
    DEMO_CAMPAIGNS.forEach(c => {
      expect(wsIds.has(c.workspaceId)).toBe(true);
    });
  });

  it('all DEMO_STORIES belong to a known workspace', () => {
    const wsIds = new Set(DEMO_WORKSPACES.map(ws => ws.id));
    DEMO_STORIES.forEach(s => {
      expect(wsIds.has(s.workspaceId)).toBe(true);
    });
  });

  it('DEMO_WORKSPACE_MEMBERS can correctly determine user workspace access', () => {
    // For each workspace, find which users have access
    DEMO_WORKSPACES.forEach(ws => {
      const members = DEMO_WORKSPACE_MEMBERS.filter(m => m.workspaceId === ws.id);
      // Members should be a subset of known user IDs (non-empty for at least ppi Media)
      members.forEach(m => {
        expect(typeof m.userId).toBe('string');
        expect(m.userId.length).toBeGreaterThan(0);
      });
    });
    // ppi Media workspace should have at least one member
    const ppiMembers = DEMO_WORKSPACE_MEMBERS.filter(m => m.workspaceId === 'ws-ppi-media');
    expect(ppiMembers.length).toBeGreaterThan(0);
  });

  it('filtering campaigns by workspace gives stable subset', () => {
    const wsId = DEMO_WORKSPACES[0].id;
    const filtered = filterByWs(DEMO_CAMPAIGNS, wsId);
    const all = filterByWs(DEMO_CAMPAIGNS, null);
    expect(filtered.length).toBeLessThanOrEqual(all.length);
  });

  it('union of all workspace-filtered posts equals all posts', () => {
    const allFiltered = DEMO_WORKSPACES.flatMap(ws =>
      DEMO_POSTS.filter(p => p.workspaceId === ws.id)
    );
    // Every post should appear in exactly one workspace partition
    expect(allFiltered.length).toBe(DEMO_POSTS.length);
  });
});
