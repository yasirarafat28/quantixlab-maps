import { z } from './zod.js';
import { BOUNDS, COUNTRIES, LANGUAGES, PROFILES } from './constants.js';

export const CountrySchema = z.enum(COUNTRIES);
export const LanguageSchema = z.string().transform((value, ctx) => {
  const base = value.toLowerCase().split('-')[0] ?? '';
  if (!(LANGUAGES as readonly string[]).includes(base)) {
    ctx.addIssue({ code: 'custom', message: 'Unsupported language' });
    return z.NEVER;
  }
  return base;
});
export const ProfileSchema = z.enum(PROFILES);
export const CoordinateSchema = z.object({
  latitude: z.number().min(BOUNDS.minLatitude).max(BOUNDS.maxLatitude),
  longitude: z.number().min(BOUNDS.minLongitude).max(BOUNDS.maxLongitude),
}).strict();
export const TimestampedCoordinateSchema = CoordinateSchema.extend({
  timestampSeconds: z.number().int().nonnegative().optional(),
}).strict();
export const ResponseMetaSchema = z.object({
  requestId: z.string(), datasetVersion: z.string(), attribution: z.string(),
}).strict();
export const ProblemSchema = z.object({
  type: z.string().url(), title: z.string(), status: z.number().int(), requestId: z.string(), detail: z.string().optional(),
}).strict();
