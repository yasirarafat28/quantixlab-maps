import { Command } from 'commander';
import { createKey } from '../auth/crypto.js';
import { ProjectsFileSchema, ScopeSchema, type Scope } from '../auth/types.js';
import { readProjects, writeProjects } from './config-file.js';

const path = process.env.PROJECTS_FILE ?? '/etc/quantixlab-maps/projects.json';
const pepper = process.env.MAP_KEY_HASH_SECRET;
const requirePepper = () => { if (!pepper || pepper.length < 32) throw new Error('MAP_KEY_HASH_SECRET must contain at least 32 characters'); return pepper; };
const findProject = async (id: string) => {
  const data = await readProjects(path); const project = data.projects.find((item) => item.id === id);
  if (!project) throw new Error(`Unknown project: ${id}`); return { data, project };
};
const scopes = (value: string): Scope[] => value.split(',').map((item) => ScopeSchema.parse(item.trim()));
const appendKey = async (projectId: string, type: 'publishable' | 'secret', values: string[]) => {
  const { data, project } = await findProject(projectId); const created = createKey(type, requirePepper());
  project.keys.push({ id: created.id, type, hash: created.hash, scopes: values.map((v) => ScopeSchema.parse(v)), createdAt: new Date().toISOString() });
  await writeProjects(path, data); process.stdout.write(`${created.token}\n`);
};

const cli = new Command().name('maps').description('Quantix Lab Maps operator CLI');
const project = cli.command('project');
project.command('create').argument('<id>').requiredOption('--name <name>').action(async (id, options) => {
  let data; try { data = await readProjects(path); } catch { data = ProjectsFileSchema.parse({ schemaVersion: 1, projects: [] }); }
  if (data.projects.some((item) => item.id === id)) throw new Error(`Project already exists: ${id}`);
  data.projects.push({ id, name: options.name, enabled: true, keys: [], quotas: {} }); await writeProjects(path, data);
});
project.command('list').action(async () => {
  const data = await readProjects(path); process.stdout.write(`${JSON.stringify(data.projects.map((p) => ({ id: p.id, name: p.name, enabled: p.enabled, keys: p.keys.length })), null, 2)}\n`);
});
const key = cli.command('key');
key.command('create').argument('<project>').requiredOption('--type <type>').requiredOption('--scopes <scopes>').action(async (id, options) => {
  if (!['publishable', 'secret'].includes(options.type)) throw new Error('type must be publishable or secret');
  const selected = scopes(options.scopes);
  if (options.type === 'publishable' && (selected.length !== 1 || selected[0] !== 'assets:read')) throw new Error('publishable keys require only assets:read');
  if (options.type === 'secret' && selected.includes('assets:read')) throw new Error('server keys cannot use assets:read');
  await appendKey(id, options.type, selected);
});
key.command('rotate').argument('<project>').argument('<key-id>').option('--overlap-hours <hours>', 'rotation overlap', '24').action(async (id, keyId, options) => {
  const { data, project: p } = await findProject(id); const old = p.keys.find((item) => item.id === keyId);
  if (!old || old.revokedAt) throw new Error(`Active key not found: ${keyId}`);
  old.expiresAt = new Date(Date.now() + Number(options.overlapHours) * 3_600_000).toISOString();
  const created = createKey(old.type, requirePepper()); p.keys.push({ id: created.id, type: old.type, hash: created.hash, scopes: old.scopes, createdAt: new Date().toISOString() });
  await writeProjects(path, data); process.stdout.write(`${created.token}\n`);
});
key.command('revoke').argument('<project>').argument('<key-id>').action(async (id, keyId) => {
  const { data, project: p } = await findProject(id); const selected = p.keys.find((item) => item.id === keyId);
  if (!selected) throw new Error(`Key not found: ${keyId}`); selected.revokedAt = new Date().toISOString(); await writeProjects(path, data);
});
cli.command('quota').command('set').argument('<project>').argument('<operation>').argument('<per-minute>').action(async (id, operation, amount) => {
  const { data, project: p } = await findProject(id); const value = Number(amount);
  const allowed = ['assets', 'geocode', 'route', 'match', 'matrix', 'usage'] as const;
  if (!allowed.includes(operation) || !Number.isInteger(value) || value <= 0) throw new Error('operation and positive integer quota are required');
  p.quotas[operation as typeof allowed[number]] = value; await writeProjects(path, data);
});
cli.command('config').command('validate').action(async () => { const data = await readProjects(path); process.stdout.write(`valid: ${data.projects.length} projects\n`); });
await cli.parseAsync();
