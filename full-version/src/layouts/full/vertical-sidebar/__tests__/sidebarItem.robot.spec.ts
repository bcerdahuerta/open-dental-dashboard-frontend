import { describe, expect, it } from 'vitest';

import sidebarItem, { type menu } from '@/layouts/full/vertical-sidebar/sidebarItem';

function flatten(items: menu[]): menu[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

describe('Sidebar retired modules', () => {
  it('has no robot or credit links or credit section', () => {
    const items = flatten(sidebarItem);
    expect(items.filter((item) => /\/(credit|robots)(\/|$)/.test(item.to ?? ''))).toEqual([]);
    expect(items.filter((item) => item.requiredProduct === 'credit' || item.header === 'Credit')).toEqual([]);
    expect(items.map((item) => item.title)).not.toContain('Robot Monitor');
  });

  it('keeps extraction navigation and writeback available', () => {
    expect(flatten(sidebarItem).map((item) => item.to)).toEqual(expect.arrayContaining([
      '/main/extraction', '/main/extraction/runs', '/main/extraction/schedules', '/writeback/live'
    ]));
  });
});
