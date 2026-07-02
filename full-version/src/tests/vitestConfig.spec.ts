import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

describe('vitest config', () => {
  it('rejects focused tests in CI and local run mode', () => {
    const testFileDir = dirname(fileURLToPath(import.meta.url));
    const configPath = resolve(testFileDir, '../../vitest.config.ts');
    const configSource = readFileSync(configPath, 'utf8');

    expect(configSource).toMatch(/allowOnly:\s*false/);
  });
});
