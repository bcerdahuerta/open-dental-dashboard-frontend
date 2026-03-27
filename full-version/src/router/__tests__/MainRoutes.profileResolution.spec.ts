import { describe, expect, it } from 'vitest';
import MainRoutes from '@/router/MainRoutes';

describe('MainRoutes profile resolution integration', () => {
  it('keeps pipelines route and includes profile resolution route', () => {
    const children = MainRoutes.children ?? [];
    const paths = children.map((route) => route.path);

    expect(paths).toContain('/admin/pipelines');
    expect(paths).toContain('/admin/profile-resolution');
  });
});
