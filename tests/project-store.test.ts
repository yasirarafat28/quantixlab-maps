import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createKey } from '../src/auth/crypto.js';
import { ProjectStore } from '../src/auth/project-store.js';

let directory: string | undefined;
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
describe('project store', () => {
  it('authenticates hashes and retains the last valid atomic configuration', async () => {
    directory = await mkdtemp(join(tmpdir(), 'qlm-auth-')); const path = join(directory, 'projects.json'); const pepper = 'p'.repeat(32);
    const created = createKey('publishable', pepper); const valid = { schemaVersion: 1, projects: [{ id: 'tourbond', name: 'TourBond', enabled: true,
      keys: [{ id: created.id, type: 'publishable', hash: created.hash, scopes: ['assets:read'], createdAt: new Date().toISOString() }], quotas: {} }] };
    await writeFile(path, JSON.stringify(valid)); const store = new ProjectStore(path, pepper); await store.reload(true);
    expect((await store.authenticate(created.token))?.project.id).toBe('tourbond');
    await new Promise((resolve) => setTimeout(resolve, 5)); await writeFile(path, '{invalid');
    expect((await store.authenticate(created.token))?.project.id).toBe('tourbond');
  });
});
