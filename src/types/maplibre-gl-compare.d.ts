/**
 * `@maplibre/maplibre-gl-compare` ships no TypeScript types (plain CommonJS, `module.exports = Compare`) --
 * this is a minimal shim covering only the API this app actually calls (see its API.md for the full list).
 */
declare module '@maplibre/maplibre-gl-compare' {
  import type { Map as MapLibreMap } from 'maplibre-gl';

  interface CompareOptions {
    orientation?: 'vertical' | 'horizontal';
    mousemove?: boolean;
  }

  export default class Compare {
    constructor(a: MapLibreMap, b: MapLibreMap, container: string | HTMLElement, options?: CompareOptions);
    setSlider(x: number): void;
    on(type: 'slideend', fn: (data: { currentPosition: number }) => void): this;
    off(type: 'slideend', fn: (data: { currentPosition: number }) => void): this;
    remove(): void;
  }
}
