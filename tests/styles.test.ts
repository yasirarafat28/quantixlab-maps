import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Layer = {
  id: string;
  type: string;
  'source-layer'?: string;
  layout?: Record<string, unknown>;
};
type Style = { version: number; glyphs: string; layers: Layer[] };

const config = JSON.parse(
  readFileSync('deploy/maps/tilemaker-config.json', 'utf8'),
) as { layers: Record<string, unknown> };
const styles = ['light', 'dark'].map((theme) => JSON.parse(
  readFileSync(`deploy/maps/style-${theme}.template.json`, 'utf8'),
) as Style);
const legacyStyles = ['light', 'dark'].map((theme) => JSON.parse(
  readFileSync(`deploy/maps/style-${theme}-v1.template.json`, 'utf8'),
) as Style);

describe('versioned basemap styles', () => {
  it.each(legacyStyles)('repairs labels before v2 promotion', (style) => {
    const labels = style.layers.filter((layer) => layer.type === 'symbol');
    for (const layer of labels) {
      const expression = JSON.stringify(layer.layout?.['text-field']);
      expect(expression).toContain('name:latin');
      expect(expression).toContain('name:en');
      expect(expression).toContain('ref');
      expect(expression.indexOf('name:en')).toBeLessThan(expression.indexOf('name:latin'));
    }
  });

  it.each(styles)('references only configured source layers', (style) => {
    expect(style.version).toBe(8);
    expect(style.glyphs).toContain('{fontstack}/{range}.pbf');
    for (const layer of style.layers) {
      if (layer['source-layer']) {
        expect(config.layers).toHaveProperty(layer['source-layer']);
      }
    }
  });

  it.each(styles)('renders the complete navigation basemap hierarchy', (style) => {
    const ids = new Set(style.layers.map((layer) => layer.id));
    for (const id of [
      'landcover', 'landuse', 'park', 'water', 'waterway', 'boundaries',
      'building', 'tunnels', 'road-casing', 'road', 'bridges', 'railways',
      'road-label', 'water-label', 'aerodrome-label', 'place-label',
      'poi-label', 'peak-label', 'building-label', 'house-number',
    ]) expect(ids).toContain(id);
  });

  it.each(styles)('keeps current tiles compatible and prioritizes local names', (style) => {
    const named = style.layers.filter((layer) =>
      layer.type === 'symbol' && layer.id !== 'house-number');
    for (const layer of named) {
      const expression = JSON.stringify(layer.layout?.['text-field']);
      expect(expression).toContain('name');
      expect(expression).toContain('name:latin');
      expect(expression).toContain('name:en');
    }
    for (const id of ['road-label', 'place-label']) {
      const expression = style.layers.find((layer) => layer.id === id)
        ?.layout?.['text-field'] as unknown[];
      expect(expression[0]).toBe('format');
      expect(JSON.stringify(expression)).toContain('font-scale');
    }
  });
});
