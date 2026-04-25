declare module '@mapbox/polyline' {
  type LatLng = [number, number];
  export function decode(str: string, precision?: number): LatLng[];
  export function encode(coordinates: LatLng[], precision?: number): string;
  const _default: { decode: typeof decode; encode: typeof encode };
  export default _default;
}
