import { z } from './zod.js';
import { CoordinateSchema, LanguageSchema, ProfileSchema, ResponseMetaSchema, TimestampedCoordinateSchema } from './common.js';

const RoutePointSchema = CoordinateSchema.extend({
  headingDegrees: z.number().min(0).lt(360).optional(),
  headingToleranceDegrees: z.number().min(0).max(180).optional(),
  radiusMeters: z.number().positive().max(1_000).optional(),
}).strict();
export const RouteRequestSchema = z.object({
  profile: ProfileSchema, points: z.array(RoutePointSchema).min(2).max(25), language: LanguageSchema.optional(),
}).strict();
export const MatchRequestSchema = z.object({
  profile: ProfileSchema, points: z.array(TimestampedCoordinateSchema).min(2).max(2_000),
  gpsAccuracyM: z.number().positive().max(100).optional(), searchRadiusM: z.number().positive().max(100).optional(),
}).strict();
export const MatrixRequestSchema = z.object({
  profile: ProfileSchema, sources: z.array(CoordinateSchema).min(1).max(25), targets: z.array(CoordinateSchema).min(1).max(25),
}).strict().refine((v) => v.sources.length * v.targets.length <= 625, { message: 'Maximum 625 source-target pairs' });
const ManeuverSchema = z.object({
  instruction: z.string(), distanceMeters: z.number().nonnegative(), durationSeconds: z.number().nonnegative(),
  beginShapeIndex: z.number().int().nonnegative(), endShapeIndex: z.number().int().nonnegative(),
  type: z.number().int().nonnegative().optional(), streetNames: z.array(z.string()).optional(),
  verbalTransitionAlertInstruction: z.string().optional(), verbalPreTransitionInstruction: z.string().optional(),
  verbalPostTransitionInstruction: z.string().optional(), signText: z.array(z.string()).optional(),
}).strict();
const LegSchema = z.object({
  encodedPolyline6: z.string(), distanceMeters: z.number().nonnegative(), durationSeconds: z.number().nonnegative(), maneuvers: z.array(ManeuverSchema),
}).strict();
export const RouteResponseSchema = ResponseMetaSchema.extend({
  distanceMeters: z.number().nonnegative(), durationSeconds: z.number().nonnegative(), legs: z.array(LegSchema).min(1),
}).strict();
export const MatchResponseSchema = ResponseMetaSchema.extend({
  encodedPolyline6: z.string(), distanceMeters: z.number().nonnegative(), durationSeconds: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
  matchedPoints: z.array(z.object({
    latitude: z.number(), longitude: z.number(), matchType: z.enum(['MATCHED', 'INTERPOLATED', 'UNMATCHED']),
    edgeIndex: z.number().int().nonnegative().optional(), distanceAlongEdge: z.number().nonnegative().optional(),
    distanceFromTracePointM: z.number().nonnegative().optional(),
  }).strict()),
}).strict();
export const MatrixResponseSchema = ResponseMetaSchema.extend({
  distancesMeters: z.array(z.array(z.number().nonnegative().nullable())),
  durationsSeconds: z.array(z.array(z.number().nonnegative().nullable())),
}).strict();
export type RouteRequest = z.infer<typeof RouteRequestSchema>;
export type MatchRequest = z.infer<typeof MatchRequestSchema>;
export type MatrixRequest = z.infer<typeof MatrixRequestSchema>;
