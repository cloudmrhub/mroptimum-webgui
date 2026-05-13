/**
 * Values match @niivue/niivue PEN_TYPE. Import them locally because Vite's
 * optimizeDeps pre-bundle for @niivue/niivue currently omits the PEN_TYPE export
 * (see node_modules/.vite/deps/@niivue_niivue.js export list).
 */
export const NI_PEN_TYPE = {
  PEN: 0,
  RECTANGLE: 1,
  ELLIPSE: 2,
} as const;
