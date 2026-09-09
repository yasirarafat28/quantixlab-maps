export const ATTRIBUTION = '© OpenStreetMap contributors';
export const COUNTRIES = [
  'BD', 'IN', 'PK', 'NP', 'BT', 'LK', 'MM', 'ID', 'PH',
  'TH', 'MY', 'SG', 'VN', 'KH', 'LA', 'BN', 'TL', 'MV',
] as const;
export const LANGUAGES = [
  'en', 'bn', 'hi', 'ur', 'ne', 'dz', 'si', 'ta', 'my', 'id',
  'tl', 'th', 'ms', 'zh', 'vi', 'km', 'lo', 'pt', 'tet', 'dv',
] as const;
export const PROFILES = ['DRIVING', 'BICYCLE', 'WALKING'] as const;
export const BOUNDS = { minLongitude: 60, maxLongitude: 142, minLatitude: -12, maxLatitude: 38 } as const;

export const resolveLanguage = (value?: string): string => {
  if (!value) return 'en';
  return value.toLowerCase().split('-')[0] ?? 'en';
};
