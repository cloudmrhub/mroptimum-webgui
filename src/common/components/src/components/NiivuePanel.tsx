import React, { useState } from "react"
import { Box, Card, CardContent } from "@mui/material"
import LocationTable from "./LocationTable";
import { ROITable } from "../../../../app/results/Rois";
import { DrawToolkit, DrawToolkitProps } from "./DrawToolKit";
import GUI from 'lil-gui';
import "./Toolbar.scss";
import { DualSlider } from "../../Cmr-components/double-slider/DualSlider";
import TKDualRange from "../../Cmr-components/tk-dualrange/TKDualRange";

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

    // --- X Slice ---
    // helper to clamp and round
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const round3 = (v: number) => Math.round(v * 1000) / 1000;

    // Local state mirrors props.mms[0]
    const [xVal, setXVal] = React.useState(round3(mms[0]));

    // Keep local state in sync when Niivue (or parent) updates mms[0]
    React.useEffect(() => {
        setXVal(round3(mms[0]));
    }, [mms[0]]);

    const applyX = (val: number) => {
        const v = clamp(round3(val), mins[0], maxs[0]);
        setXVal(v);
        // Use local yVal/zVal so we don't regress other axes
        props.nv.scene.crosshairPos = [
            ratio(v, 0),
            ratio(yVal, 1),
            ratio(zVal, 2),
        ];
        props.nv.drawScene();
    };

    // --- Y Slice ---
    const [yVal, setYVal] = React.useState(round3(mms[1]));

    React.useEffect(() => {
        setYVal(round3(mms[1]));
    }, [mms[1]]);

    const applyY = (val: number) => {
        const v = clamp(round3(val), mins[1], maxs[1]);
        setYVal(v);
        // Use local xVal/zVal
        props.nv.scene.crosshairPos = [
            ratio(xVal, 0),
            ratio(v, 1),
            ratio(zVal, 2),
        ];
        props.nv.drawScene();
    };

    // --- Z Slice ---
    const [zVal, setZVal] = React.useState(round3(mms[2]));

    React.useEffect(() => {
        setZVal(round3(mms[2]));
    }, [mms[2]]);

    const applyZ = (val: number) => {
        const v = clamp(round3(val), mins[2], maxs[2]);
        setZVal(v);
        // Use local xVal/yVal
        props.nv.scene.crosshairPos = [
            ratio(xVal, 0),
            ratio(yVal, 1),
            ratio(v, 2),
        ];
        props.nv.drawScene();
    };

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
                                        value={xVal}
                                        min={mins[0]}
                                        max={maxs[0]}
                                        step={1}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            if (!Number.isFinite(next)) return;
                                            applyX(next);
                                        }}
                                        onBlur={(e) => {
                                            const next = Number(e.target.value);
                                            applyX(clamp(next, mins[0], maxs[0]));
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
                                    min={mins[0]}
                                    max={maxs[0]}
                                    step={1}
                                    value={xVal}
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
                                        // keep the input's value as a number for smooth dragging,
                                        // but still *show* 3 decimals by formatting on blur.
                                        value={yVal}
                                        min={mins[1]}
                                        max={maxs[1]}
                                        step={0.001}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            if (!Number.isFinite(next)) return;
                                            applyY(next);
                                        }}
                                        onBlur={(e) => {
                                            const next = Number(e.target.value);
                                            // snap the field to 3-decimal formatting on blur
                                            applyY(next);
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
                                    min={mins[1]}
                                    max={maxs[1]}
                                    step={0.001}
                                    value={yVal}
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
                                        value={zVal.toFixed(3)}   // show up to 3 decimals
                                        min={mins[2]}
                                        max={maxs[2]}
                                        step={0.001}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            if (!Number.isFinite(next)) return;
                                            applyZ(next);
                                        }}
                                        onBlur={(e) => {
                                            const next = Number(e.target.value);
                                            applyZ(clamp(next, mins[2], maxs[2]));
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
                                    min={mins[2]}
                                    max={maxs[2]}
                                    step={0.001}
                                    value={zVal}
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

                                /* Preserve your value masking (scientific notation pair) */
                                transform={(x) => x / a + b}
                                inverse={(y) => a * y - a * b}

                                /* Optional tuning to feel closer to TestKarts */
                                step={0.001}
                                precision={3}
                                accentColor="#580f8b"
                            />

                            {/* Gamma */}
                            <div style={{ marginTop: 20, marginBottom: 15 }}>
                                <label htmlFor="gamma" style={{ display: 'block', marginBottom: 6 }}>
                                    Gamma: {props.gamma.toFixed(2)}
                                </label>
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


function createGUI(nv: any) {
    const element = document.getElementById('controlDock');
    if (element?.firstChild) {
        element.innerHTML = '';
    }
    const gui = new GUI({
        container: (document.getElementById('controlDock') as HTMLElement)
    });
    const myObject = {
        xSlice: 0,
        ySlice: 1,
        zSlice: 2,
        min: 0,
        max: 1
    };
    return { gui };
}

