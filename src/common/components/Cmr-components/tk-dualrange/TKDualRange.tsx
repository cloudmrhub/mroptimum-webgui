import React from "react";
import "./tk-dual-range.css";

type Props = {
  name?: string;

  // Domain in REAL space (e.g., Niivue robust_min / robust_max)
  minDomain: number;
  maxDomain: number;

  // Current window in REAL space (e.g., cal_min / cal_max mirrored in React)
  valueLow: number;
  valueHigh: number;

  // Callbacks must accept REAL values
  onChangeLow: (v: number) => void;
  onChangeHigh: (v: number) => void;

  // Optional: render-space masking
  transform?: (x: number) => number; // real -> render
  inverse?: (y: number) => number;   // render -> real
  step?: number;                     // step in RENDER space
  precision?: number;                // input boxes precision (render-space)
  accentColor?: string;              // slider color
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function TKDualRange({
  name = "Values",
  minDomain,
  maxDomain,
  valueLow,
  valueHigh,
  onChangeLow,
  onChangeHigh,
  transform = (x) => x,
  inverse = (y) => y,
  step,
  precision = 3,
  accentColor = "#580f8b",
}: Props) {
  // Map domain & current values into RENDER space (like TestKarts)
  const tMin = transform(minDomain);
  const tMax = transform(maxDomain);
  const tLow = transform(valueLow);
  const tHigh = transform(valueHigh);

  const span = Math.max(1e-12, tMax - tMin);
  const pct = (t: number) => ((t - tMin) / span) * 100;
  const s = step ?? Math.max(span * 0.001, Number.EPSILON);

  // Keep ends from crossing; clamp in REAL space against the other end
  const handleLowRender = (nextRender: number) => {
    const nextReal = clamp(inverse(nextRender), minDomain, valueHigh);
    onChangeLow(nextReal);
  };
  const handleHighRender = (nextRender: number) => {
    const nextReal = clamp(inverse(nextRender), valueLow, maxDomain);
    onChangeHigh(nextReal);
  };

  // Editable inputs show RENDER values (like the article)
  const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(precision) : "");
  const parse = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };


  return (
    <div className="tkdr">
      {/* Header row: two inputs at the ends with Min / Max labels */}
      <div className="tkdr__row tkdr__row--ends">
        <div className="tkdr__group">
          <span className="tkdr__hint">Min</span>
          <input
            className="tkdr__num"
            type="number"
            step={s}
            value={fmt(tLow)}
            onChange={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              handleLowRender(n);
            }}
            onBlur={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              handleLowRender(n);
            }}
          />
        </div>

        <div className="tkdr__group">
          <span className="tkdr__hint">Max</span>
          <input
            className="tkdr__num"
            type="number"
            step={s}
            value={fmt(tHigh)}
            onChange={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              handleHighRender(n);
            }}
            onBlur={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              handleHighRender(n);
            }}
          />
        </div>
      </div>

      {/* Track with two native range inputs stacked */}
      <div className="tkdr__track" style={{ ["--tkdr-accent" as any]: accentColor }}>
        <div
          className="tkdr__range-fill"
          style={{
            left: `${pct(Math.min(tLow, tHigh))}%`,
            width: `${Math.abs(pct(tHigh) - pct(tLow))}%`,
          }}
          aria-hidden
        />
        <input
          className="tkdr__range"
          type="range"
          min={tMin}
          max={tMax}
          step={s}
          value={tLow}
          onChange={(e) => handleLowRender(Number(e.target.value))}
        />
        <input
          className="tkdr__range tkdr__range--top"
          type="range"
          min={tMin}
          max={tMax}
          step={s}
          value={tHigh}
          onChange={(e) => handleHighRender(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
