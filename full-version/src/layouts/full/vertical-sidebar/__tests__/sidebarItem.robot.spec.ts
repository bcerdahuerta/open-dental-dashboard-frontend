import { describe, expect, it } from 'vitest';

import sidebarItem from '@/layouts/full/vertical-sidebar/sidebarItem';

describe('Sidebar robot monitor link', () => {
  it('shows Robot Monitor entry under extraction section', () => {
    const robotItem = sidebarItem.find((item) => item.to === '/main/extraction/robots');

    expect(robotItem).toBeDefined();
    expect(robotItem?.title).toBe('Robot Monitor');
    expect(robotItem?.requiredProduct).toBe('extraction');
  });
});
