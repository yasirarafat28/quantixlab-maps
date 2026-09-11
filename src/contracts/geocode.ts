import { z } from './zod.js';
import { CoordinateSchema, CountrySchema, LanguageSchema, ResponseMetaSchema } from './common.js';

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120), countryCode: CountrySchema.optional(),
  latitude: z.coerce.number().optional(), longitude: z.coerce.number().optional(),
  language: LanguageSchema.optional(), limit: z.coerce.number().int().min(1).max(10).default(6),
}).strict().refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
  message: 'latitude and longitude must be provided together',
}).refine((v) => v.latitude === undefined
  || CoordinateSchema.safeParse({ latitude: v.latitude, longitude: v.longitude }).success, {
  message: 'proximity is outside supported bounds',
});
export const ReverseQuerySchema = z.object({
  latitude: z.coerce.number(), longitude: z.coerce.number(),
  radiusMeters: z.coerce.number().min(0).max(50_000).default(1_000),
  language: LanguageSchema.optional(), limit: z.coerce.number().int().min(1).max(5).default(1),
}).strict().refine((v) => CoordinateSchema.safeParse({ latitude: v.latitude, longitude: v.longitude }).success,
  { message: 'coordinate is outside supported bounds' });
export const PlaceSchema = z.object({
  id: z.string(), name: z.string(), secondaryLabel: z.string(), point: CoordinateSchema,
  countryCode: CountrySchema.optional(), state: z.string().optional(), county: z.string().optional(),
  city: z.string().optional(), postcode: z.string().optional(), street: z.string().optional(), houseNumber: z.string().optional(),
}).strict();
export const GeocodeResponseSchema = ResponseMetaSchema.extend({ items: z.array(PlaceSchema) }).strict();
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type ReverseQuery = z.infer<typeof ReverseQuerySchema>;
