import React, { useState } from "react"
import { Box, Card, CardContent } from "@mui/material"
import LocationTable from "./LocationTable";
import { ROITable } from "../../app/results/Rois";
import { DrawToolkit, DrawToolkitProps } from "./DrawToolKit";
// import GUI from "lil-gui";
import "./Toolbar.scss";
// import { DualSlider } from "../../Cmr-components/double-slider/DualSlider";
import TKDualRange from "./Cmr-components/tk-dualrange/TKDualRange";
import { CmrLabel } from "cloudmr-ux";

interface NiivuePanelProps {
  nv: any;
  // displayVertical:boolean;
  pipelineID: string;
  locationTableVisible: boolean;
  locationData: any[];
  decimalPrecision: number;
  drawToolkitProps: DrawToolkitProps;
  resampleImage: () => void;
  layerList: React.ComponentProps<any>[];
  mins: number[];
  maxs: number[];
  mms: number[];
  rois: {}[];
  min: number;
  max: number;
  setMin: (min: number) => void;
  setMax: (max: number) => void;

  zipAndSendROI: (url: string, filename: string, blob: Blob) => Promise<void>;
  unzipAndRenderROI: (url: string) => Promise<void>;
  setLabelAlias: (label: string | number, alias: string) => void;

  transformFactors: { a: number, b: number };
  rangeKey: number;

  gamma: number;
  gammaKey: number;
  setGamma: (val: number) => void;
}


function toRatio(val: number, min: number, max: number) {
  return (val - min) / (max - min);
}

export function NiivuePanel(props: NiivuePanelProps) {
  const sliceControl = React.useRef(null);
  const canvas = React.useRef(null)
  const histogram = React.useRef<HTMLElement>(null);
  const { mins, maxs, mms } = props;
  // const {gui} = createGUI(props.nv);

  let height = window.innerHeight * 0.75;

  // This hook is for initialization, called only once
  React.useEffect(() => {
    props.nv.attachTo('niiCanvas');
    props.nv.opts.dragMode = props.nv.dragModes.pan;
  }, [canvas]);
  // This hook is called when show distribution state changed
  React.useEffect(() => {
    props.nv.resizeListener();
    props.nv.setMultiplanarLayout(2);
    props.nv.setMultiplanarPadPixels(10);
    props.resampleImage();
  }, [window.innerWidth, window.innerHeight]);

  React.useEffect(() => {
    setTimeout(() => {
      props.nv.resizeListener();
      props.nv.setMultiplanarLayout(2);
      props.nv.setMultiplanarPadPixels(10);
      props.resampleImage();
    }, 300)
  }, [])

  React.useEffect(() => {
    props.resampleImage();
  }, [histogram]);

  const [pause, pauseUpdate] = React.useState(false);

  const [rangeMin, setRangeMin] = useState(undefined);
  const [rangeMax, setRangemax] = useState(undefined);


  //Transform factors are applied when scientific notation for voxel values become necessary
  const { a, b } = props.transformFactors;

  const safeSpan = (i: 0 | 1 | 2) => Math.max(1e-9, maxs[i] - mins[i]);
  const ratio = (val: number, i: 0 | 1 | 2) => (val - mins[i]) / safeSpan(i);

  // Voxel sizes and dimensions - snap slider to same positions as Niivue scroll
  const vol = props.nv?.volumes?.[0];
  const meta = vol?.getImageMetadata?.();
  const nx = Math.max(1, meta?.nx ?? 1);
  const ny = Math.max(1, meta?.ny ?? 1);
  const nz = Math.max(1, meta?.nz ?? 1);
  // Step and slider range: align so range values = voxel centers exactly
  const stepX = nx > 1 ? safeSpan(0) / nx : safeSpan(0) * 0.01;
  const stepY = ny > 1 ? safeSpan(1) / ny : safeSpan(1) * 0.01;
  const stepZ = nz > 1 ? safeSpan(2) / nz : safeSpan(2) * 0.01;
  const sliderMinX = nx > 1 ? mins[0] + 0.5 * stepX : mins[0];
  const sliderMaxX = nx > 1 ? maxs[0] - 0.5 * stepX : maxs[0];
  const sliderMinY = ny > 1 ? mins[1] + 0.5 * stepY : mins[1];
  const sliderMaxY = ny > 1 ? maxs[1] - 0.5 * stepY : maxs[1];
  const sliderMinZ = nz > 1 ? mins[2] + 0.5 * stepZ : mins[2];
  const sliderMaxZ = nz > 1 ? maxs[2] - 0.5 * stepZ : maxs[2];

  // Snap to nearest slice using Niivue's mm2frac/frac2mm so values match scroll exactly
  const snapToVoxel = (mm: number, axis: 0 | 1 | 2): number => {
    const n = axis === 0 ? nx : axis === 1 ? ny : nz;
    const mm3 = [mms[0], mms[1], mms[2]];
    mm3[axis] = mm;
    let frac: number[];
    try {
      frac = props.nv.mm2frac(mm3);
    } catch {
      const f = (mm - mins[axis]) / safeSpan(axis);
      frac = [ratio(mms[0], 0), ratio(mms[1], 1), ratio(mms[2], 2)];
      frac[axis] = f;
    }
    // Niivue scroll uses voxel centers: frac = (i + 0.5) / n for i=0..n-1
    const idx = Math.round(frac[axis] * n - 0.5);
    const fracSnapped = n > 1 ? (Math.max(0, Math.min(n - 1, idx)) + 0.5) / n : 0.5;
    frac[axis] = fracSnapped;
    try {
      return props.nv.frac2mm(frac)[axis];
    } catch {
      return mins[axis] + fracSnapped * safeSpan(axis);
    }
  };

  // Use Niivue's mm2frac for crosshairPos so display matches onLocationChange
  const mmToFrac = (x: number, y: number, z: number): [number, number, number] => {
    try {
      return props.nv.mm2frac([x, y, z]);
    } catch {
      return [ratio(x, 0), ratio(y, 1), ratio(z, 2)];
    }
  };

  // --- X Slice ---
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const round3 = (v: number) => Math.round(v * 1000) / 1000;

  // Local state mirrors props.mms[0]
  const [xVal, setXVal] = React.useState(round3(mms[0]));


  const applyX = (val: number) => {
    const v = clamp(snapToVoxel(val, 0), sliderMinX, sliderMaxX);
    setXVal(v);
    props.nv.scene.crosshairPos = mmToFrac(v, yVal, zVal);
    props.nv.drawScene();
  };

  // --- Y Slice ---
  const [yVal, setYVal] = React.useState(round3(mms[1]));

  const applyY = (val: number) => {
    const v = clamp(snapToVoxel(val, 1), sliderMinY, sliderMaxY);
    setYVal(v);
    props.nv.scene.crosshairPos = mmToFrac(xVal, v, zVal);
    props.nv.drawScene();
  };

  // --- Z Slice ---
  const [zVal, setZVal] = React.useState(round3(mms[2]));

  const applyZ = (val: number) => {
    const v = clamp(snapToVoxel(val, 2), sliderMinZ, sliderMaxZ);
    setZVal(v);
    props.nv.scene.crosshairPos = mmToFrac(xVal, yVal, v);
    props.nv.drawScene();
  };

  // Keep local state in sync when Niivue updates mms (e.g. from scroll)
  React.useEffect(() => {
    const fmt = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0);
    setXVal(fmt(mms[0]));
    setYVal(fmt(mms[1]));
    setZVal(fmt(mms[2]));
  }, [mms]);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: {
          xs: "column",
          md: "row",
        },
        // minHeight: 0,
        flexWrap: "nowrap",
      }}
    >
      {/* Left Column */}
      <Box
        sx={{
          width: {
            xs: "100%",
            md: "63%",
          },
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          alignItems: "center",
          justifyContent: "flex-start",
          mb: { xs: 2, md: 0 },
        }}
      >
        <LocationTable
          tableData={props.locationData}
          isVisible={true}
          decimalPrecision={props.decimalPrecision}
          style={{
            width: '100%', height: '30pt', paddingTop: "10px", color: 'white',
            background: "black",
          }}
        />

        {/* Fixed Canvas Height */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: {
              xs: 300,  // phones and very small devices
              sm: 400,  // tablets or small laptops
              md: 1035,  // desktops and up
            },
          }}
        >
          <canvas id={'niiCanvas'} ref={canvas}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </Box>

      </Box>

      {/* Right Column */}
      <Box
        sx={{
          width: {
            xs: "100%",
            md: "35%",
          },
          display: "flex",
          flexDirection: "column",
          ml: {
            xs: 0,
            md: 1,
          },
          minHeight: 0,
          height: "100%"
        }}
      >
        <DrawToolkit {...props.drawToolkitProps}
          style={{
            height: '30pt',
            marginBottom: '10px',
          }} />
        <Box id={"controlDock"} className={'title'} style={{ width: '100%' }} ref={sliceControl}>
          Slice Position
        </Box>
        <Card variant="outlined" sx={{ mb: 2, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <CardContent>
            <Box style={{ display: 'flex', flex: 1, minWidth: '245px', flexDirection: 'column' }}>

              <div style={{ marginBottom: 20 }}>
                {/* Label and text field */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <label htmlFor="xSlice">
                    X:
                  </label>
                  <input
                    type="number"
                    value={xVal.toFixed(3)}
                    min={sliderMinX}
                    max={sliderMaxX}
                    step={stepX}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      applyX(next);
                    }}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      applyX(clamp(next, sliderMinX, sliderMaxX));
                    }}
                    style={{
                      width: 80,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* X Slider */}
                <input
                  id="xSlice"
                  type="range"
                  min={sliderMinX}
                  max={sliderMaxX}
                  step={stepX}
                  value={Math.max(sliderMinX, Math.min(sliderMaxX, xVal))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    applyX(next);
                  }}
                  style={{ width: "100%", accentColor: "#580f8b" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                {/* Label + editable field  */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <label htmlFor="ySlice">
                    Y:
                  </label>
                  <input
                    type="number"
                    value={yVal.toFixed(3)}
                    min={sliderMinY}
                    max={sliderMaxY}
                    step={stepY}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      applyY(next);
                    }}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      applyY(clamp(next, sliderMinY, sliderMaxY));
                    }}
                    style={{
                      width: 100,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* Y Slider */}
                <input
                  id="ySlice"
                  type="range"
                  min={sliderMinY}
                  max={sliderMaxY}
                  step={stepY}
                  value={Math.max(sliderMinY, Math.min(sliderMaxY, yVal))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    applyY(next);
                  }}
                  style={{ width: "100%", accentColor: "#580f8b" }}
                />
              </div>

              <div>
                {/* Label + editable field */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <label htmlFor="zSlice">
                    Z:
                  </label>
                  <input
                    type="number"
                    value={zVal.toFixed(3)}
                    min={sliderMinZ}
                    max={sliderMaxZ}
                    step={stepZ}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      applyZ(next);
                    }}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      applyZ(clamp(next, sliderMinZ, sliderMaxZ));
                    }}
                    style={{
                      width: 100,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* Slice Slider */}
                <input
                  id="zSlice"
                  type="range"
                  min={sliderMinZ}
                  max={sliderMaxZ}
                  step={stepZ}
                  value={Math.max(sliderMinZ, Math.min(sliderMaxZ, zVal))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    applyZ(next);
                  }}
                  style={{ width: "100%", accentColor: "#580f8b" }}
                />
              </div>
            </Box>
          </CardContent>
        </Card>

        <Box id={"controlDock"} className={'title'} style={{ width: '100%' }} ref={sliceControl}>
          Contrast Adjustments
        </Box>
        <Card variant="outlined" sx={{ mb: 2, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <CardContent>
            <Box style={{ display: 'flex', flex: 1, minWidth: '245px', flexDirection: 'column' }}>

              <TKDualRange
                name="Values:"
                /* Domain in REAL space: robust range for the track */
                minDomain={props.nv.volumes[0]?.robust_min ?? 0}
                maxDomain={props.nv.volumes[0]?.robust_max ?? 1}

                /* Current window in REAL space: cal_min / cal_max mirrored in React */
                valueLow={props.min}
                valueHigh={props.max}

                /* When user drags either thumb or edits the inputs */
                onChangeLow={(min) => {
                  const v = props.nv.volumes[0];
                  if (!v) return;
                  v.cal_min = min;
                  props.nv.refreshLayers(v, 0, props.nv.volumes.length);
                  props.nv.drawScene();
                  props.setMin(min);
                }}
                onChangeHigh={(max) => {
                  const v = props.nv.volumes[0];
                  if (!v) return;
                  v.cal_max = max;
                  props.nv.refreshLayers(v, 0, props.nv.volumes.length);
                  props.nv.drawScene();
                  props.setMax(max);
                }}

                /* Transform to render space: matches checkRange() in Niivue.jsx */
                transform={(x) => a * x - a * b}
                inverse={(y) => y / a + b}

                /* Optional tuning to feel closer to TestKarts */
                step={0.001}
                precision={3}
                accentColor="#580f8b"
              />

              {/* Gamma */}
              <div style={{ marginTop: 20, marginBottom: 15 }}>
                <CmrLabel style={{ display: 'block', marginBottom: 6 }}>
                  Gamma: {props.gamma.toFixed(2)}
                </CmrLabel>
                <input
                  id="gamma"
                  type="range"
                  min={0.1}
                  max={3.0}
                  step={0.05}
                  value={props.gamma}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    props.setGamma(val);   // update in Niivue.jsx
                    props.nv.setGamma(val); // update the Niivue engine
                  }}
                  style={{ width: '100%', accentColor: '#580f8b' }}
                  key={props.gammaKey} // force remount when Toolbar calls nv.onResetGamma()
                />
              </div>


              <Box style={{ height: '100%' }}>
                {props.layerList}
              </Box>

            </Box>
          </CardContent>
        </Card>

        {/* Histogram + ROI Table combined height = 600 */}
        <Box sx={{ width: "100%", height: 600 }}>
          <Box
            ref={histogram}
            id={'histoplot'}
            sx={{
              width: "100%",
              height: 250,
              mb: 2,
            }}
          >
          </Box>

          <Box sx={{ width: "100%", height: 350 }}>
            <ROITable
              pipelineID={props.pipelineID}
              rois={props.rois}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              nv={props.nv}
              resampleImage={props.resampleImage}
              unpackROI={props.unzipAndRenderROI}
              zipAndSendROI={props.zipAndSendROI}
              setLabelAlias={props.setLabelAlias}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}


// function createGUI(nv: any) {
//     const element = document.getElementById('controlDock');
//     if (element?.firstChild) {
//         element.innerHTML = '';
//     }
//     const gui = new GUI({
//         container: (document.getElementById('controlDock') as HTMLElement)
//     });
//     const myObject = {
//         xSlice: 0,
//         ySlice: 1,
//         zSlice: 2,
//         min: 0,
//         max: 1
//     };
//     return { gui };
// }

