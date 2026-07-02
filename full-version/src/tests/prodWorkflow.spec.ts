import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

describe('production workflow contract', () => {
  it('validates the same root-base build contract that Vercel serves', () => {
    const testFileDir = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = resolve(testFileDir, '../../package.json');
    const prodWorkflowPath = resolve(testFileDir, '../../../.github/workflows/prod.yml');

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts: Record<string, string> };
    const prodWorkflow = readFileSync(prodWorkflowPath, 'utf8');

    expect(packageJson.scripts.build).toBe('vue-tsc --noEmit && vite build');
    expect(packageJson.scripts.build).not.toContain('--base=/vue/');
    expect(prodWorkflow).toContain('npm run build');
    expect(prodWorkflow).not.toContain('npm run build-prod');
    expect(prodWorkflow).not.toContain('easingthemes/ssh-deploy');
  });
});
