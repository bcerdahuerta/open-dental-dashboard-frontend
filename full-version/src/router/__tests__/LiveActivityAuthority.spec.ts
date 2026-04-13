import { describe, expect, it } from 'vitest';
import MainRoutes from '@/router/MainRoutes';
import sidebarItem from '@/layouts/full/vertical-sidebar/sidebarItem';

describe('Live Activity authoritative surface wiring', () => {
  it('keeps only /writeback/live route and removes orphan operations surface route', () => {
    const children = MainRoutes.children ?? [];

    const liveRoutes = children.filter((route) => route.path === '/writeback/live');
    expect(liveRoutes).toHaveLength(1);
    expect(liveRoutes[0]?.name).toBe('WritebackLive');

    const operationsLiveRoutes = children.filter((route) => route.path === '/operations/live');
    expect(operationsLiveRoutes).toHaveLength(0);
  });

  it('keeps sidebar Live Activity pointing to authoritative route only', () => {
    const liveItems = sidebarItem.filter((item) => item.title === 'Live Activity');
    expect(liveItems).toHaveLength(1);
    expect(liveItems[0]?.to).toBe('/writeback/live');

    const orphanItems = sidebarItem.filter((item) => item.to === '/operations/live');
    expect(orphanItems).toHaveLength(0);
  });
});
