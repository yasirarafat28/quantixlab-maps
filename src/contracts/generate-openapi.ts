import { writeFile } from 'node:fs/promises';
import { createOpenApiDocument } from './openapi.js';

await writeFile('openapi/quantixlab-maps.v1.json', `${JSON.stringify(createOpenApiDocument())}\n`, 'utf8');
