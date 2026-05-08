import React from "react"
import { Box } from "@mui/material"
import LocationTable from "./LocationTable";
import { ROITable } from "../../app/results/Rois";
// import GUI from "lil-gui";
import "./Toolbar.scss";
// import { DualSlider } from "../../Cmr-components/double-slider/DualSlider";
import {
  NiivueSlicePosition,
  NiivueContrastAdjustments,
  DrawToolkit,
} from "cloudmr-ux";
import type { DrawToolkitProps } from "cloudmr-ux";

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



export function NiivuePanel(props: NiivuePanelProps) {
  const sliceControl = React.useRef(null);
  const canvas = React.useRef(null)
  const histogram = React.useRef<HTMLElement>(null);
  const { mins, maxs, mms } = props;
  // const {gui} = createGUI(props.nv);

  let height = window.innerHeight * 0.75;

  // This hook is for initialization, called only once
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await props.nv.attachTo("niiCanvas");
        if (!cancelled) {
          props.nv.opts.dragMode = props.nv.dragModes.pan;
        }
      } catch (e) {
        console.error("Niivue attachTo failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
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

        <NiivueSlicePosition
          nv={props.nv}
          mins={mins}
          maxs={maxs}
          mms={mms}
          style={{ minWidth: 245 }}
        />

        <NiivueContrastAdjustments
          nv={props.nv}
          min={props.min}
          max={props.max}
          setMin={props.setMin}
          setMax={props.setMax}
          transformFactors={props.transformFactors}
          gamma={props.gamma}
          gammaKey={props.gammaKey}
          setGamma={props.setGamma}
          layerList={props.layerList}
          style={{ minWidth: 245 }}
        />

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

