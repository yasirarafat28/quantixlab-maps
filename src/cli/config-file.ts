import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ProjectsFileSchema } from '../auth/types.js';

export type ProjectsConfig = ReturnType<typeof ProjectsFileSchema.parse>;
export const readProjects = async (path: string): Promise<ProjectsConfig> =>
  ProjectsFileSchema.parse(JSON.parse(await readFile(path, 'utf8')));

export const writeProjects = async (path: string, value: ProjectsConfig): Promise<void> => {
  const parsed = ProjectsFileSchema.parse(value); const temporary = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
  await chmod(temporary, 0o600); await rename(temporary, path);
};
