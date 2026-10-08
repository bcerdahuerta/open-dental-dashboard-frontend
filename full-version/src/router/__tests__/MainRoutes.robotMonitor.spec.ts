import { describe, expect, it } from 'vitest';

import MainRoutes from '@/router/MainRoutes';

describe('MainRoutes retired modules', () => {
  it('does not expose robot or credit routes', () => {
    const children = MainRoutes.children ?? [];
    expect(children.filter((route) => /\/(credit|robots)(\/|$)/.test(route.path))).toEqual([]);
    expect(children.filter((route) => route.meta?.requiredProduct === 'credit')).toEqual([]);
    expect(children.map((route) => route.name)).not.toContain('RobotMonitor');
  });

  it('preserves extraction and writeback entrypoints', () => {
    const paths = (MainRoutes.children ?? []).map((route) => route.path);
    expect(paths).toEqual(expect.arrayContaining([
      '/main/extraction', '/main/extraction/runs', '/main/extraction/schedules', '/writeback/live'
    ]));
  });
});
