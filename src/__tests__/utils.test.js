import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uid, getMediaType, fmtDate, fpos, parseJSON } from '../utils/store.js';

// ── uid ───────────────────────────────────────────────────────────────────────
describe('uid()', () => {
  it('generates a non-empty string', () => {
    expect(uid()).toBeTruthy();
    expect(typeof uid()).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = Array.from({ length: 100 }, uid);
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it('contains only alphanumeric characters', () => {
    expect(uid()).toMatch(/^[a-z0-9]+$/);
  });
});

// ── getMediaType ──────────────────────────────────────────────────────────────
describe('getMediaType()', () => {
  const file = (type, name) => ({ type, name });

  it('returns "video" for video files', () => {
    expect(getMediaType(file('video/mp4', 'clip.mp4'))).toBe('video');
    expect(getMediaType(file('video/webm', 'clip.webm'))).toBe('video');
  });

  it('returns "logo" for files with "logo" in name', () => {
    expect(getMediaType(file('image/png', 'company_logo.png'))).toBe('logo');
    expect(getMediaType(file('image/svg+xml', 'LOGO_final.svg'))).toBe('logo');
  });

  it('returns "image" for image files (without logo in name)', () => {
    expect(getMediaType(file('image/jpeg', 'photo.jpg'))).toBe('image');
    expect(getMediaType(file('image/png', 'banner.png'))).toBe('image');
  });

  it('returns "document" for other file types', () => {
    expect(getMediaType(file('application/pdf', 'brief.pdf'))).toBe('document');
    expect(getMediaType(file('text/plain', 'notes.txt'))).toBe('document');
  });

  it('video takes priority over logo in name', () => {
    expect(getMediaType(file('video/mp4', 'logo_animation.mp4'))).toBe('video');
  });
});

// ── fmtDate ───────────────────────────────────────────────────────────────────
describe('fmtDate()', () => {
  it('returns empty string for falsy input', () => {
    expect(fmtDate('')).toBe('');
    expect(fmtDate(null)).toBe('');
    expect(fmtDate(undefined)).toBe('');
  });

  it('formats a date string in German locale', () => {
    const result = fmtDate('2026-06-15');
    // Should contain day number and German month abbreviation
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Jun/i);
  });

  it('includes weekday abbreviation', () => {
    // 2026-06-15 is a Monday → "Mo" in German
    const result = fmtDate('2026-06-15');
    expect(result).toMatch(/Mo/i);
  });
});

// ── fpos ──────────────────────────────────────────────────────────────────────
describe('fpos()', () => {
  it('returns "center" when no focusPoint', () => {
    expect(fpos(null)).toBe('center');
    expect(fpos(undefined)).toBe('center');
    expect(fpos({})).toBe('center');
  });

  it('returns "x% y%" string from focusPoint', () => {
    expect(fpos({ focusPoint: { x: 30, y: 70 } })).toBe('30% 70%');
    expect(fpos({ focusPoint: { x: 50, y: 50 } })).toBe('50% 50%');
    expect(fpos({ focusPoint: { x: 0, y: 100 } })).toBe('0% 100%');
  });
});

// ── parseJSON ────────────────────────────────────────────────────────────────
describe('parseJSON()', () => {
  it('parses valid JSON', () => {
    expect(parseJSON('{"key":"value"}')).toEqual({ key: 'value' });
    expect(parseJSON('{"items":[1,2,3]}')).toEqual({ items: [1, 2, 3] });
  });

  it('strips markdown code fences before parsing', () => {
    const withFence = '```json\n{"key":"value"}\n```';
    expect(parseJSON(withFence)).toEqual({ key: 'value' });
  });

  it('strips code fences without language tag', () => {
    expect(parseJSON('```{"key":"val"}```')).toEqual({ key: 'val' });
  });

  it('returns null for invalid JSON', () => {
    expect(parseJSON('not json')).toBeNull();
    expect(parseJSON('{broken:')).toBeNull();
    expect(parseJSON('')).toBeNull();
  });

  it('parses nested objects', () => {
    const json = '{"score":{"total":85,"hints":["tip1","tip2"]}}';
    expect(parseJSON(json)).toEqual({
      score: { total: 85, hints: ['tip1', 'tip2'] },
    });
  });
});
