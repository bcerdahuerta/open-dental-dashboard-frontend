import { describe, expect, it } from 'vitest';

import MainRoutes from '@/router/MainRoutes';

describe('MainRoutes robot monitor integration', () => {
  it('includes the extraction robot monitor page route', () => {
    const children = MainRoutes.children ?? [];
    const paths = children.map((route) => route.path);

    expect(paths).toContain('/main/extraction/robots');
  });
});
