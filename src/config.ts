import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  PUBLIC_BASE_URL: z.string().url().default('https://maps.quantixlab.dev'),
  DATASET_ROOT: z.string().default('/srv/quantixlab-maps/current'),
  PROJECTS_FILE: z.string().default('/etc/quantixlab-maps/projects.json'),
  MAP_KEY_HASH_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  PHOTON_URL: z.string().url().default('http://photon:2322'),
  VALHALLA_URL: z.string().url().default('http://valhalla:8002'),
  MARTIN_URL: z.string().url().default('http://martin:3000'),
  OPERATOR_TOKEN: z.string().min(32),
});

export type Config = z.infer<typeof EnvSchema>;
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => EnvSchema.parse(env);
