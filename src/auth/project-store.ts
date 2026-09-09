import { readFile, stat } from 'node:fs/promises';
import { hashSecret, hashesEqual, parseKey } from './crypto.js';
import { ProjectsFileSchema, type Principal } from './types.js';

export class ProjectStore {
  private data = ProjectsFileSchema.parse({ schemaVersion: 1, projects: [] });
  private modifiedMs = -1;

  constructor(private readonly path: string, private readonly pepper: string) {}

  async reload(force = false): Promise<void> {
    try {
      const info = await stat(this.path);
      if (!force && info.mtimeMs === this.modifiedMs) return;
      const candidate = ProjectsFileSchema.parse(JSON.parse(await readFile(this.path, 'utf8')));
      this.data = candidate; this.modifiedMs = info.mtimeMs;
    } catch (error) {
      if (force || this.modifiedMs < 0) throw error;
    }
  }

  async authenticate(token: string): Promise<Principal | undefined> {
    await this.reload();
    const parsed = parseKey(token);
    if (!parsed) return undefined;
    for (const project of this.data.projects) {
      const key = project.keys.find((item) => item.id === parsed.id && item.type === parsed.type);
      if (!key) continue;
      const expired = key.expiresAt && Date.parse(key.expiresAt) <= Date.now();
      if (!project.enabled || key.revokedAt || expired) return undefined;
      return hashesEqual(hashSecret(parsed.secret, this.pepper), key.hash) ? { project, key } : undefined;
    }
    return undefined;
  }
}
