import { z } from 'zod';

export const ScopeSchema = z.enum(['assets:read', 'geocode:read', 'route:read', 'match:read', 'matrix:read', 'usage:read']);
export const KeySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9]{6,64}$/), type: z.enum(['publishable', 'secret']),
  hash: z.string().regex(/^[a-f0-9]{64}$/), scopes: z.array(ScopeSchema).min(1),
  createdAt: z.string().datetime(), expiresAt: z.string().datetime().optional(), revokedAt: z.string().datetime().optional(),
}).strict().superRefine((key, ctx) => {
  if (key.type === 'publishable' && (key.scopes.length !== 1 || key.scopes[0] !== 'assets:read')) ctx.addIssue({ code: 'custom', message: 'Publishable keys require only assets:read' });
  if (key.type === 'secret' && key.scopes.includes('assets:read')) ctx.addIssue({ code: 'custom', message: 'Server keys cannot use assets:read' });
});
const QuotasSchema = z.object({ assets: z.number().int().positive().optional(), geocode: z.number().int().positive().optional(),
  route: z.number().int().positive().optional(), match: z.number().int().positive().optional(), matrix: z.number().int().positive().optional(), usage: z.number().int().positive().optional() }).strict();
export const ProjectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,64}$/), name: z.string().min(1).max(120), enabled: z.boolean().default(true),
  keys: z.array(KeySchema), quotas: QuotasSchema.default({}),
}).strict();
export const ProjectsFileSchema = z.object({ schemaVersion: z.literal(1), projects: z.array(ProjectSchema) }).strict();
export type Scope = z.infer<typeof ScopeSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type MapsKey = z.infer<typeof KeySchema>;
export type Principal = { project: Project; key: MapsKey };
