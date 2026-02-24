import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatLastSeen } from './dateFormatter';

describe('formatLastSeen', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-15 12:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "offline" for null timestamp', () => {
    expect(formatLastSeen(null)).toBe('offline');
  });

  it('should return "offline" for undefined timestamp', () => {
    expect(formatLastSeen(undefined)).toBe('offline');
  });

  it('should return "online" for timestamp within 30 seconds', () => {
    const timestamp = new Date('2024-01-15T11:59:45Z'); // 15 seconds ago
    expect(formatLastSeen(timestamp)).toBe('online');
  });

  it('should return "last seen just now" for timestamp within 1 minute', () => {
    const timestamp = new Date('2024-01-15T11:59:15Z'); // 45 seconds ago
    expect(formatLastSeen(timestamp)).toBe('last seen just now');
  });

  it('should return "last seen X minutes ago" for timestamps within 1 hour', () => {
    const timestamp1 = new Date('2024-01-15T11:59:00Z'); // 1 minute ago
    expect(formatLastSeen(timestamp1)).toBe('last seen 1 minute ago');

    const timestamp5 = new Date('2024-01-15T11:55:00Z'); // 5 minutes ago
    expect(formatLastSeen(timestamp5)).toBe('last seen 5 minutes ago');

    const timestamp30 = new Date('2024-01-15T11:30:00Z'); // 30 minutes ago
    expect(formatLastSeen(timestamp30)).toBe('last seen 30 minutes ago');
  });

  it('should return "last seen X hours ago" for timestamps within 24 hours', () => {
    const timestamp1 = new Date('2024-01-15T11:00:00Z'); // 1 hour ago
    expect(formatLastSeen(timestamp1)).toBe('last seen 1 hour ago');

    const timestamp5 = new Date('2024-01-15T07:00:00Z'); // 5 hours ago
    expect(formatLastSeen(timestamp5)).toBe('last seen 5 hours ago');

    const timestamp12 = new Date('2024-01-15T00:00:00Z'); // 12 hours ago
    expect(formatLastSeen(timestamp12)).toBe('last seen 12 hours ago');
  });

  it('should return "last seen X days ago" for timestamps within 7 days', () => {
    const timestamp1 = new Date('2024-01-14T12:00:00Z'); // 1 day ago
    expect(formatLastSeen(timestamp1)).toBe('last seen 1 day ago');

    const timestamp3 = new Date('2024-01-12T12:00:00Z'); // 3 days ago
    expect(formatLastSeen(timestamp3)).toBe('last seen 3 days ago');

    const timestamp6 = new Date('2024-01-09T12:00:00Z'); // 6 days ago
    expect(formatLastSeen(timestamp6)).toBe('last seen 6 days ago');
  });

  it('should return formatted date for timestamps older than 7 days', () => {
    const timestamp = new Date('2024-01-01T12:00:00Z'); // 14 days ago
    expect(formatLastSeen(timestamp)).toBe('last seen Jan 1');
  });

  it('should include year for timestamps from different year', () => {
    const timestamp = new Date('2023-12-25T12:00:00Z'); // Previous year
    expect(formatLastSeen(timestamp)).toBe('last seen Dec 25, 2023');
  });

  it('should handle string timestamps', () => {
    const timestamp = '2024-01-15T11:55:00Z'; // 5 minutes ago
    expect(formatLastSeen(timestamp)).toBe('last seen 5 minutes ago');
  });

  it('should handle Date objects', () => {
    const timestamp = new Date('2024-01-15T11:55:00Z'); // 5 minutes ago
    expect(formatLastSeen(timestamp)).toBe('last seen 5 minutes ago');
  });
});
