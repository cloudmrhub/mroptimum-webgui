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
  // Values from Niivue are already in transformed space (post-checkRange).
  // Slider works directly with these transformed values.
  const span = Math.max(1e-12, maxDomain - minDomain);
  const pct = (t: number) => ((t - minDomain) / span) * 100;
  const s = step ?? Math.max(span * 0.001, Number.EPSILON);

  // Slider values are in transformed space; clamp and send directly
  const handleLowSlider = (next: number) => {
    onChangeLow(clamp(next, minDomain, valueHigh));
  };
  const handleHighSlider = (next: number) => {
    onChangeHigh(clamp(next, valueLow, maxDomain));
  };

  // Display ORIGINAL (pre-transform) values with scientific notation for small numbers.
  // Apply inverse() to recover the original values for display (e.g. 6.921e-11).
  const realLow = inverse(valueLow);
  const realHigh = inverse(valueHigh);
  const realMinDomain = inverse(minDomain);
  const realMaxDomain = inverse(maxDomain);

  const fmt = (v: number) =>
    Number.isFinite(v)
      ? v !== 0 && Math.abs(v) < 0.01
        ? Number(v).toExponential(precision)
        : v.toFixed(precision)
      : "";
  const parse = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };


  return (
    <div className="tkdr">
      {/* Header row: inputs show ORIGINAL values in scientific notation (e.g. 6.921e-11) */}
      <div className="tkdr__row tkdr__row--ends">
        <div className="tkdr__group">
          <span className="tkdr__hint">Min</span>
          <input
            className="tkdr__num"
            type="text"
            inputMode="decimal"
            value={fmt(realLow)}
            onChange={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              // User enters original value; transform it back for the callback
              onChangeLow(transform(clamp(n, realMinDomain, realHigh)));
            }}
            onBlur={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              onChangeLow(transform(clamp(n, realMinDomain, realHigh)));
            }}
          />
        </div>

        <div className="tkdr__group">
          <span className="tkdr__hint">Max</span>
          <input
            className="tkdr__num"
            type="text"
            inputMode="decimal"
            value={fmt(realHigh)}
            onChange={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              // User enters original value; transform it back for the callback
              onChangeHigh(transform(clamp(n, realLow, realMaxDomain)));
            }}
            onBlur={(e) => {
              const n = parse(e.target.value);
              if (!Number.isFinite(n)) return;
              onChangeHigh(transform(clamp(n, realLow, realMaxDomain)));
            }}
          />
        </div>
      </div>

      {/* Track with two native range inputs stacked (using transformed values directly) */}
      <div className="tkdr__track" style={{ ["--tkdr-accent" as any]: accentColor }}>
        <div
          className="tkdr__range-fill"
          style={{
            left: `${pct(Math.min(valueLow, valueHigh))}%`,
            width: `${Math.abs(pct(valueHigh) - pct(valueLow))}%`,
          }}
          aria-hidden
        />
        <input
          className="tkdr__range"
          type="range"
          min={minDomain}
          max={maxDomain}
          step={s}
          value={valueLow}
          onChange={(e) => handleLowSlider(Number(e.target.value))}
        />
        <input
          className="tkdr__range tkdr__range--top"
          type="range"
          min={minDomain}
          max={maxDomain}
          step={s}
          value={valueHigh}
          onChange={(e) => handleHighSlider(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
