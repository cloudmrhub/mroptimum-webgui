import React, {useEffect, useState} from 'react'
import {Button, Typography} from '@mui/material'
import {Box} from '@mui/material'
import {Fade} from '@mui/material'
import {Popper} from '@mui/material'
import {Paper} from '@mui/material'
import {Niivue, NVImage} from '@niivue/niivue'
import Toolbar from './components/Toolbar.tsx'
import {SettingsPanel} from './components/SettingsPanel.jsx'
import {ColorPicker} from './components/ColorPicker.jsx'
import {NumberPicker} from './components/NumberPicker.jsx'
import {LayersPanel} from './components/LayersPanel.jsx'
import {NiivuePanel} from './components/NiivuePanel.tsx'
import NVSwitch from './components/Switch.jsx'
import LocationTable from './components/LocationTable.jsx'
import Layer from './components/Layer.jsx'
import './Niivue.css'
import EditConfirmation from "../Cmr-components/dialogue/EditConfirmation";
import axios from "axios";
import {ROI_UPLOAD} from "../../../Variables";
import Confirmation from "../Cmr-components/dialogue/Confirmation";
import Plotly from "plotly.js-dist-min";
import {DrawToolkit} from "./components/DrawToolKit";
import {ROITable} from "../../../app/results/Rois";
import {calculateMean, calculateStandardDeviation} from "./components/stats";
const SLICE_TYPE = Object.freeze({
    AXIAL: 0,
    CORONAL: 1,
    SAGITTAL: 2,
    MULTIPLANAR: 3,
    RENDER: 4,
});
const DRAG_MODE = Object.freeze({
    none: 0,
    contrast: 1,
    measurement: 2,
    pan: 3,
    slicer3D: 4,
    callbackOnly: 5,
});
const MULTIPLANAR_TYPE = Object.freeze({
    AUTO: 0,
    COLUMN: 1,
    GRID: 2,
    ROW: 3,
});
//
// let largestScale = 0;
//
// Niivue.prototype.sliceScale = function (forceVox = false) {
//     let dimsMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL);
//     if (forceVox) dimsMM = this.screenFieldOfViewVox(SLICE_TYPE.AXIAL);
//     let longestAxis = Math.max(dimsMM[0], Math.max(dimsMM[1], dimsMM[2]));
//     let volScale = [
//         dimsMM[0] / longestAxis,
//         dimsMM[1] / longestAxis,
//         dimsMM[2] / longestAxis,
//     ];
//     let vox = [this.back.dims[1], this.back.dims[2], this.back.dims[3]];
//     largestScale = Math.max(...volScale)
//     return { volScale, vox, longestAxis, dimsMM };
// }; // sliceScale()
//
// const orgScaleSlice = Niivue.prototype.scaleSlice;
//
// /*
//     Proxy NiiVue draw2D to produce square quadrants
//  */
// Niivue.prototype.scaleSlice = function (
//     w,
//     h,
//     widthPadPixels = 0,
//     heightPadPixels = 0 ) {
//     const superScaleSlice = orgScaleSlice.bind(this);
//     return superScaleSlice(largestScale*2,largestScale*2,widthPadPixels,heightPadPixels);
// };
//
// const orgDraw2D = Niivue.prototype.draw2D;
// let vtPadding = 300;
// /*
//     Proxy NiiVue draw2D to produce square quadrants
//  */
// Niivue.prototype.draw2D = function (
//     leftTopWidthHeight, axCorSag, customMM = NaN ) {
//     const superDraw2D = orgDraw2D.bind(this);
//     let largestDim = Math.max(leftTopWidthHeight[2],leftTopWidthHeight[3]);
//     leftTopWidthHeight[0] +=(largestDim-leftTopWidthHeight[2]);
//     leftTopWidthHeight[1] +=(largestDim-leftTopWidthHeight[3])
//     return superDraw2D(leftTopWidthHeight,axCorSag,customMM);
// };

// not included in public docs
Niivue.prototype.drawSceneCore = function () {
    if (!this.initialized) {
        return; // do not do anything until we are initialized (init will call drawScene).
    }
    this.colorbarHeight = 0;
    this.gl.clearColor(
        this.opts.backColor[0],
        this.opts.backColor[1],
        this.opts.backColor[2],
        this.opts.backColor[3]
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    if (this.bmpTexture && this.thumbnailVisible) {
        //draw the thumbnail image and exit
        this.drawThumbnail();
        return;
    }
    let posString = "";
    if (
        this.volumes.length === 0 ||
        typeof this.volumes[0].dims === "undefined"
    ) {
        if (this.meshes.length > 0) {
            this.screenSlices = []; // empty array
            this.opts.sliceType = SLICE_TYPE.RENDER; //only meshes loaded: we must use 3D render mode
            this.draw3D(); //meshes loaded but no volume
            if (this.opts.isColorbar) this.drawColorbar();
            return;
        }
        this.drawLoadingText(this.loadingText);
        return;
    }
    if (!("dims" in this.back)) return;
    if (
        this.uiData.isDragging &&
        this.scene.clipPlaneDepthAziElev[0] < 1.8 &&
        this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
    ) {
        //user dragging over a 3D rendering
        let x = this.uiData.dragStart[0] - this.uiData.dragEnd[0];
        let y = this.uiData.dragStart[1] - this.uiData.dragEnd[1];
        let depthAziElev = this.uiData.dragClipPlaneStartDepthAziElev.slice();
        depthAziElev[1] -= x;
        depthAziElev[1] = depthAziElev[1] % 360;
        depthAziElev[2] += y;
        if (
            depthAziElev[1] !== this.scene.clipPlaneDepthAziElev[1] ||
            depthAziElev[2] !== this.scene.clipPlaneDepthAziElev[2]
        ) {
            this.scene.clipPlaneDepthAziElev = depthAziElev;
            return this.setClipPlane(this.scene.clipPlaneDepthAziElev);
        }
    } //dragging over rendering
    if (
        this.sliceMosaicString.length < 1 &&
        this.opts.sliceType === SLICE_TYPE.RENDER
    ) {
        if (this.opts.isColorbar) this.reserveColorbarPanel();
        this.screenSlices = []; // empty array
        this.draw3D();
        if (this.opts.isColorbar) this.drawColorbar();
        return;
    }
    if (this.opts.isColorbar) this.reserveColorbarPanel();
    let maxVols = this.getMaxVols();
    let isDrawGraph =
        this.opts.sliceType === SLICE_TYPE.MULTIPLANAR &&
        maxVols > 1 &&
        this.graph.autoSizeMultiplanar &&
        this.graph.opacity > 0;

    if (this.sliceMosaicString.length > 0) {
        this.drawMosaic(this.sliceMosaicString);
    } else {
        // issue56 is use mm else use voxel
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.screenSlices = []; // empty array
        if (this.opts.sliceType === SLICE_TYPE.AXIAL) {
            this.draw2D([0, 0, 0, 0], 0);
        } else if (this.opts.sliceType === SLICE_TYPE.CORONAL) {
            this.draw2D([0, 0, 0, 0], 1);
        } else if (this.opts.sliceType === SLICE_TYPE.SAGITTAL) {
            this.draw2D([0, 0, 0, 0], 2);
        } else {
            //sliceTypeMultiplanar
            let isDrawPenDown =
                isFinite(this.drawPenLocation[0]) && this.opts.drawingEnabled;
            let { volScale } = this.sliceScale();
            // if (typeof this.opts.multiplanarPadPixels !== "number")
                // log.debug("multiplanarPadPixels must be numeric");
            let pad = parseFloat(this.opts.multiplanarPadPixels);
            let vScaleMax = Math.max(volScale[0], volScale[1], volScale[2]);
            // size for 2 rows, 2 columns
            let ltwh2x2 = this.scaleSlice(
                // volScale[0] + volScale[1],
                // volScale[1] + volScale[2],
                vScaleMax*2,
                vScaleMax*2,
                pad * 1,
                pad * 1
            );
            let mx = Math.max(Math.max(volScale[1], volScale[2]), volScale[0]);
            // size for 3 columns and 1 row
            let ltwh3x1 = this.scaleSlice(
                volScale[0] + volScale[0] + volScale[1],
                Math.max(volScale[1], volScale[2]),
                pad * 2
            );
            // size for 4 columns and 1 row
            let ltwh4x1 = this.scaleSlice(
                volScale[0] + volScale[0] + volScale[1] + mx,
                Math.max(volScale[1], volScale[2]),
                pad * 3
            );
            // size for 1 column * 3 rows
            let ltwh1x3 = this.scaleSlice(
                mx,
                volScale[1] + volScale[2] + volScale[2],
                0,
                pad * 2
            );
            // size for 1 column * 4 rows
            let ltwh1x4 = this.scaleSlice(
                mx,
                volScale[1] + volScale[2] + volScale[2] + mx,
                0,
                pad * 3
            );
            let isDraw3D = !isDrawPenDown && (maxVols < 2 || !isDrawGraph);
            let isDrawColumn = false;
            let isDrawGrid = false;
            let isDrawRow = false;
            if (this.opts.multiplanarLayout == MULTIPLANAR_TYPE.COLUMN)
                isDrawColumn = true;
            else if (this.opts.multiplanarLayout == MULTIPLANAR_TYPE.GRID)
                isDrawGrid = true;
            else if (this.opts.multiplanarLayout == MULTIPLANAR_TYPE.ROW)
                isDrawRow = true;
            else {
                //auto select layout based on canvas size
                if (ltwh1x3[4] > ltwh3x1[4] && ltwh1x3[4] > ltwh2x2[4])
                    isDrawColumn = true;
                else if (ltwh3x1[4] > ltwh2x2[4]) isDrawRow = true;
                else isDrawGrid = true;
            }
            if (isDrawColumn) {
                let ltwh = ltwh1x3;
                if (this.opts.multiplanarForceRender || ltwh1x4[4] >= ltwh1x3[4])
                    ltwh = ltwh1x4;
                else isDraw3D = false;
                let sX = volScale[0] * ltwh[4];
                let sY = volScale[1] * ltwh[4];
                let sZ = volScale[2] * ltwh[4];
                let sMx = mx * ltwh[4];
                //draw axial
                this.draw2D([ltwh[0], ltwh[1], sX, sY], 0);
                //draw coronal
                this.draw2D([ltwh[0], ltwh[1] + sY + pad, sX, sZ], 1);
                //draw sagittal
                this.draw2D([ltwh[0], ltwh[1] + sY + pad + sZ + pad, sY, sZ], 2);
                if (isDraw3D)
                    this.draw3D([ltwh[0], ltwh[1] + sY + sZ + sZ + pad * 3, sMx, sMx]);
            } else if (isDrawRow) {
                let ltwh = ltwh3x1;
                if (this.opts.multiplanarForceRender || ltwh4x1[4] >= ltwh3x1[4])
                    ltwh = ltwh4x1;
                else isDraw3D = false;
                let sX = volScale[0] * ltwh[4];
                let sY = volScale[1] * ltwh[4];
                let sZ = volScale[2] * ltwh[4];
                //draw axial
                this.draw2D([ltwh[0], ltwh[1], sX, sY], 0);
                //draw coronal
                this.draw2D([ltwh[0] + sX + pad, ltwh[1], sX, sZ], 1);
                //draw sagittal
                this.draw2D([ltwh[0] + sX + sX + pad * 2, ltwh[1], sY, sZ], 2);
                if (isDraw3D)
                    this.draw3D([
                        ltwh[0] + sX + sX + sY + pad * 3,
                        ltwh[1],
                        ltwh[3],
                        ltwh[3],
                    ]);
            } else if (isDrawGrid) {
                let ltwh = ltwh2x2;
                let sX = volScale[0] * ltwh[4];
                let sY = volScale[1] * ltwh[4];
                let sZ = volScale[2] * ltwh[4];
                let sS = vScaleMax*ltwh[4];
                let px = (sS-sX)/2;
                let py = (sS-sY)/2;
                let pz = (sS-sZ)/2;
                //draw axial
                this.draw2D([ltwh[0]+px, ltwh[1] + sZ + pad+pz*2+py, sX, sY], 0);
                //draw coronal
                this.draw2D([ltwh[0]+px, ltwh[1]+pz, sX, sZ], 1);
                //draw sagittal
                this.draw2D([ltwh[0] + sX + pad+px*2+py, ltwh[1]+pz, sY, sZ], 2);
                if (isDraw3D)
                    this.draw3D([ltwh[0] + sX + pad+2*px+py, ltwh[1] + sZ + pad+2*pz+py, sY, sY]);
            } //if isDrawGrid
        } //if multiplanar
    } //if mosaic not 2D
    if (this.opts.isRuler) this.drawRuler();
    if (this.opts.isColorbar) this.drawColorbar();
    if (isDrawGraph) this.drawGraph();
    if (this.uiData.isDragging) {
        if (this.uiData.mouseButtonCenterDown) {
            this.dragForCenterButton([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        if (this.opts.dragMode === DRAG_MODE.slicer3D) {
            this.dragForSlicer3D([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        if (this.opts.dragMode === DRAG_MODE.pan) {
            this.dragForPanZoom([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        if (
            this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
        )
            return;
        if (this.opts.dragMode === DRAG_MODE.measurement) {
            //if (this.opts.isDragShowsMeasurementTool) {
            this.drawMeasurementTool([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        let width = Math.abs(this.uiData.dragStart[0] - this.uiData.dragEnd[0]);
        let height = Math.abs(this.uiData.dragStart[1] - this.uiData.dragEnd[1]);
        this.drawSelectionBox([
            Math.min(this.uiData.dragStart[0], this.uiData.dragEnd[0]),
            Math.min(this.uiData.dragStart[1], this.uiData.dragEnd[1]),
            width,
            height,
        ]);
    }
    const pos = this.frac2mm([
        this.scene.crosshairPos[0],
        this.scene.crosshairPos[1],
        this.scene.crosshairPos[2],
    ]);

    posString =
        pos[0].toFixed(2) + "×" + pos[1].toFixed(2) + "×" + pos[2].toFixed(2);
    this.readyForSync = true; // by the time we get here, all volumes should be loaded and ready to be drawn. We let other niivue instances know that we can now reliably sync draw calls (images are loaded)
    this.sync();
    return posString;
}; // drawSceneCore()

export const nv = new Niivue({
    loadingText: '',
    isColorbar: true,
    isRadiologicalConvention: true,
    textHeight:0.03,
    dragMode: 'pan',
    // crosshairColor: [0.098,0.453,0.824]
    crosshairColor: [1,1,0]
});

window.nv = nv;

// The NiiVue component wraps all other components in the UI. 
// It is exported so that it can be used in other projects easily
export default function NiiVueport(props) {
    const selectedVolume = props.selectedVolume;
    const setSelectedVolume = props.setSelectedVolume;
    // const nv = props.nv;
    const [openSettings, setOpenSettings] = React.useState(false)
    const [openLayers, setOpenLayers] = React.useState(false)
    const [crosshairColor, setCrosshairColor] = React.useState(nv.opts.crosshairColor)
    const [selectionBoxColor, setSelectionBoxColor] = React.useState(nv.opts.selectionBoxColor)
    const [backColor, setBackColor] = React.useState(nv.opts.backColor)
    const [clipPlaneColor, setClipPlaneColor] = React.useState(nv.opts.clipPlaneColor)
    const [layers, setLayers] = React.useState(nv.volumes)
    const [cornerText, setCornerText] = React.useState(false)
    const [radiological, setRadiological] = React.useState(false)
    const [crosshair3D, setCrosshair3D] = React.useState(false)
    const [textSize, setTextSize] = React.useState(nv.opts.textHeight)
    const [colorBar, setColorBar] = React.useState(nv.opts.isColorbar)
    const [worldSpace, setWorldSpace] = React.useState(nv.opts.isSliceMM)
    const [clipPlane, setClipPlane] = React.useState(nv.currentClipPlaneIndex > 0 ? true : false)
    // TODO: add crosshair size state and setter
    const [opacity, setopacity] = React.useState(1.0)
    const [drawingEnabled, setDrawingEnabled] = React.useState(nv.opts.drawingEnabled);
    const [drawPen, setDrawPen] = React.useState(nv.opts.drawPen)
    const [drawOpacity, setDrawOpacity] = React.useState(0.8)
    const [crosshairOpacity, setCrosshairOpacity] = React.useState(nv.opts.crosshairColor[3])
    const [clipPlaneOpacity, setClipPlaneOpacity] = React.useState(nv.opts.clipPlaneColor[3])
    const [locationTableVisible, setLocationTableVisible] = React.useState(true)
    const [locationData, setLocationData] = React.useState([])
    const [decimalPrecision, setDecimalPrecision] = React.useState(2)
    const [orientCube, setOrientCube] = React.useState(nv.opts.isOrientCube)
    const [ruler, setRuler] = React.useState(nv.opts.isRuler)
    const [multiplanarPadPixels, setMultiplanarPadPixels] = React.useState(nv.opts.multiplanarPadPixels)
    const [maxDrawUndoBitmaps, setMaxDrawUndoBitmaps] = React.useState(nv.opts.maxDrawUndoBitmaps)
    const [sagittalNoseLeft, setSagittalNoseLeft] = React.useState(nv.opts.sagittalNoseLeft)
    const [rulerWidth, setRulerWidth] = React.useState(nv.opts.rulerWidth)
    const [longTouchTimeout, setLongTouchTimeout] = React.useState(nv.opts.longTouchTimeout)
    const [doubleTouchTimeout, setDoubleTouchTimeout] = React.useState(nv.opts.doubleTouchTimeout)
    const [dragToMeasure, setDragToMeasure] = React.useState(nv.opts.isDragShowsMeasurementTool)
    const [rulerColor, setRulerColor] = React.useState(nv.opts.rulerColor)
    const [rulerOpacity, setRulerOpacity] = React.useState(nv.opts.rulerColor[3])
    const [highDPI, setHighDPI] = React.useState(false)

    const [verticalLayout, setVerticalLayout] = React.useState(false);
    const histoRef = React.useRef(null);
    const [rois, setROIs] = React.useState([]);


    React.useEffect(() => {
        if(props.displayVertical)
            resampleImage();
        // histogram.current?.addEventListener('resize',()=>props.resampleImage());
    }, [histoRef]);

    // only run this when the component is mounted on the page
    // or else it will be recursive and continuously add all
    // initial images supplied to the NiiVue component
    //
    // All subsequent imgaes should be added via a
    // button or drag and drop
    // React.useEffect(async ()=>{
    //   // props.volumes.map(async (vol)=>{
    //   //   let image = await NVImage.loadFromUrl({url:vol.url})
    //   //   nv.addVolume(image)
    //   //   setLayers([...nv.volumes])
    //   // })
    //   await nv.loadVolumes(props.volumes)
    //   setLayers([...nv.volumes])
    // }, [])

    let [boundMins,setBoundMins] = useState([0,0,0]);
    let [boundMaxs, setBoundMaxs] = useState([1,1,1]);
    let [mms, setMMs] = useState([0.5,0.5,0.5]);
    nv.onImageLoaded = () => {
        setLayers([...nv.volumes]);
        setBoundMins(nv.frac2mm([0,0,0]));
        setBoundMaxs(nv.frac2mm([1,1,1]));
        setMMs(nv.frac2mm([0.5,0.5,0.5]));
    }

    nv.onLocationChange = (data) => {
        setLocationData(data.values);
        if(data.values[0])
            setMMs(data.values[0].mm);
        if(drawingEnabled){
            setDrawingChanged(true);
            // resampleImage();
        }
    }
    nv.onMouseUp =  (data) => {
        if(drawingEnabled){
            setDrawingChanged(true);
            resampleImage();
        }
    }


    // nv.createEmptyDrawing();

    // construct an array of <Layer> components. Each layer is a NVImage or NVMesh
    const layerList = layers.map((layer) => {
        return (
            <Layer
                key={layer.name}
                image={layer}
                nv={nv}
                onColorMapChange={nvUpdateColorMap}
                onRemoveLayer={nvRemoveLayer}
                onOpacityChange={nvUpdateLayerOpacity}
                colorMapValues={nv.colormapFromKey(layer.colormap)}
                getColorMapValues={(colorMapName) => {
                    return nv.colormapFromKey(colorMapName)
                }}
            />
        )
    });


    const toggleSampleDistribution = ()=>{
        setVerticalLayout(!verticalLayout);
        // if(!showSampleDistribution)
        //     resampleImage();
        nv.resizeListener();
    }

    async function addLayer(file) {
        const nvimage = await NVImage.loadFromFile({
            file: file
        })
        nv.addVolume(nvimage)
        setLayers([...nv.volumes]);
    }

    function toggleSettings() {
        setOpenSettings(!openSettings)
    }

    function toggleLayers() {
        setOpenLayers(!openLayers)
    }

    function toggleLocationTable() {
        setLocationTableVisible(!locationTableVisible)
    }

    function nvUpdateOpacity(a) {
        console.log("Opacity = " + a)
        setopacity(a)
        let n = nv.volumes.length
        for (let i = 0; i < n; i++) {
            nv.volumes[i].opacity = a
        }
        nv.updateGLVolume()
    }


    const [dragMode, setDragMode] = useState("pan");
    
    function nvSetDragMode(dragMode){
        switch (dragMode) {
            case "none":
                nv.opts.dragMode = nv.dragModes.none;
                break;
            case "contrast":
                console.log('setting drag mode to contrast');
                nv.opts.dragMode = nv.dragModes.contrast;
                break;
            case "measurement":
                nv.opts.dragMode = nv.dragModes.measurement;
                break;
            case "pan":
                nv.opts.dragMode = nv.dragModes.pan;
                break;
        }
        // nv.drawScene();
        setDragMode(dragMode);
    }

    function nvSaveImage() {
        nv.saveImage('roi.nii', true);
    }

    function nvUpdateDrawingEnabled() {
        setDrawingEnabled(!drawingEnabled);
        nv.setDrawingEnabled(!drawingEnabled);
        nv.drawScene();
    }

    function nvSetDrawingEnabled(enabled) {
        setDrawingEnabled(enabled)
        nv.setDrawingEnabled(enabled)
        nv.drawScene();
    }

    function nvUpdateDrawPen(a) {
        setDrawPen(a.target.value)
        let penValue = a.target.value
        nv.setPenValue(penValue & 7, penValue > 7)
        if (penValue == 12) {
            nv.setPenValue(-0)
        }
    }

    function nvUpdateDrawOpacity(a) {
        setDrawOpacity(a)
        nv.setDrawOpacity(a);
    }

    function nvUpdateCrosshairColor(rgb01, a = 1) {
        setCrosshairColor([...rgb01, a])
        nv.setCrosshairColor([...rgb01, a])
    }

    function nvUpdateOrientCube() {
        nv.opts.isOrientCube = !orientCube
        setOrientCube(!orientCube)
        nv.drawScene()
    }

    function nvUpdateHighDPI() {
        nv.setHighResolutionCapable(!highDPI)
        setHighDPI(!highDPI)
    }

    function nvUpdateMultiplanarPadPixels(v) {
        nv.opts.multiplanarPadPixels = v
        setMultiplanarPadPixels(v)
        nv.drawScene();
    }

    function nvUpdateRuler() {
        nv.opts.isRuler = !ruler
        setRuler(!ruler)
        nv.drawScene()
    }

    function nvUpdateSagittalNoseLeft() {
        nv.opts.sagittalNoseLeft = !sagittalNoseLeft
        setSagittalNoseLeft(!sagittalNoseLeft)
        nv.drawScene()
    }

    function nvUpdateRulerWidth(v) {
        nv.opts.rulerWidth = v
        setRulerWidth(v)
        nv.drawScene()
    }

    function nvUpdateRulerOpacity(a) {
        nv.opts.rulerColor = [
            rulerColor[0],
            rulerColor[1],
            rulerColor[2],
            a
        ]
        setRulerOpacity(a)
        nv.drawScene()
    }

    function nvUpdateLongTouchTimeout(v) {
        nv.opts.longTouchTimeout = v
        setLongTouchTimeout(v)
    }

    function nvUpdateDoubleTouchTimeout(v) {
        nv.opts.doubleTouchTimeout = v
        setDoubleTouchTimeout(v)
    }

    function nvUpdateDragToMeasure() {
        nv.opts.isDragShowsMeasurementTool = !dragToMeasure
        setDragToMeasure(!dragToMeasure)
    }

    function nvUpdateMaxDrawUndoBitmaps(v) {
        nv.opts.maxDrawUndoBitmaps = v
        setMaxDrawUndoBitmaps(v)
    }

    function nvUpdateBackColor(rgb01, a = 1) {
        setBackColor([...rgb01, a])
        nv.opts.backColor = [...rgb01, a]
        nv.drawScene()
    }

    function nvUpdateRulerColor(rgb01, a = 1) {
        setRulerColor([...rgb01, a])
        nv.opts.rulerColor = [...rgb01, a]
        if (!ruler) {
            nv.opts.isRuler = !ruler
            setRuler(!ruler)
        }
        nv.drawScene()
    }

    function nvUpdateClipPlaneColor(rgb01, a = 1) {
        setClipPlaneColor([...rgb01, a])
        nv.opts.clipPlaneColor = [...rgb01, a]
        setClipPlane(true)
        nv.setClipPlane([0, 270, 0]) //left
        nv.updateGLVolume()
    }

    function nvUpdateClipPlane() {
        if (!clipPlane) {
            setClipPlane(true)
            nv.setClipPlane([0, 270, 0]) //left
        } else {
            setClipPlane(false)
            nv.setClipPlane([2, 0, 0]) //none
        }
    }

    function nvUpdateColorBar() {
        setColorBar(!colorBar)
        nv.opts.isColorbar = !colorBar
        nv.drawScene();
    }

    function nvUpdateTextSize(v) {
        setTextSize(v)
        nv.opts.textHeight = v
        nv.drawScene();
    }

    function updateDecimalPrecision(v) {
        setDecimalPrecision(v)
    }

    function nvUpdateWorldSpace() {
        nvUpdateCrosshair3D(!worldSpace)
        setWorldSpace(!worldSpace)
        nv.setSliceMM(!worldSpace)
    }

    function nvUpdateCornerText() {
        nv.setCornerOrientationText(!cornerText)
        setCornerText(!cornerText)
    }

    function nvUpdateCrosshair3D() {
        nv.opts.show3Dcrosshair = !crosshair3D
        nv.updateGLVolume()
        setCrosshair3D(!crosshair3D)
    }

    function nvShowCrosshair(showCrosshair){
        nv.setCrosshairWidth((showCrosshair)?1:0);
    }

    function nvUpdateRadiological() {
        nv.setRadiologicalConvention(!radiological)
        setRadiological(!radiological)
    }

    function nvUpdateCrosshairOpacity(a) {
        nv.setCrosshairColor([
            crosshairColor[0],
            crosshairColor[1],
            crosshairColor[2],
            a
        ])
        setCrosshairOpacity(a)
    }

    function nvUpdateClipPlaneOpacity(a) {
        nv.opts.clipPlaneColor = [
            clipPlaneColor[0],
            clipPlaneColor[1],
            clipPlaneColor[2],
            a
        ]
        setClipPlaneOpacity(a)
        nv.updateGLVolume()
    }

    function nvUpdateCrosshairSize(w) {
        nv.opts.crosshairWidth = w
        nv.drawScene()
    }

    function resampleImage() {
        let image = nv.volumes[0];
        let rois = [];
        let layout = {
            barmode: "overlay",
            title: 'ROI Distributions',  // Set your title here
            // height: 100,
            margin: {
                l: 50,   // left margin
                r: 50,   // right margin
                b: 50,   // bottom margin
                t: 60,   // top margin (set to a smaller value to reduce space)
                pad: 4   // padding between plot area and axis lines
            },
            xaxis: {
                autoscale: true,
                title: 'Voxel value',
                showgrid: true
                // other x-axis properties
            },
            yaxis: {
                autoscale: true,
                title: 'Bin size',
                showgrid: true
                // other y-axis properties
            },
        }; // Set the height of the plot here};
        // Bitmap depicts the drawn content
        if(nv.drawBitmap==null){
            if(verticalLayout){
                Plotly.newPlot('histoplotv', [], layout);
            }else
                Plotly.newPlot('histoplot', [], layout);
            setROIs([]);
            return;
        }//If ROI (drawing) is not inside the stack

        // find and collect in an array all the cvalues in data.img euqual to 1
        // indexed by roi value
        let samples = {1:[],2:[],3:[]};
        for (let i = 0; i < nv.drawBitmap.length; i++) {
            //val&7-1 converts to r,g,b index through bit operations
            if(samples[nv.drawBitmap[i]]===undefined){
                samples[nv.drawBitmap[i]] = [];
            }
            samples[nv.drawBitmap[i]].push(image.img[i]);
        }
        const colors = ['#bbb','#f00','#0f0','#00f']
        for(let key in samples){
            let sample = samples[key];
            if(sample.length>0&&key!=='0'){
                console.log(key);
                rois.push({
                    id:key,
                    label:key,
                    color:colors[key],
                    mu:calculateMean(sample),
                    std:calculateStandardDeviation(sample)})
            }
        }
        setROIs(rois);
        // plot a histogram of numbers
        let traces = [{
                x: samples[1],
                type: "histogram",
                opacity: 0.5,
                marker: {
                    color: 'red',
                }
            },
            {
                x: samples[2],
                type: "histogram",
                opacity: 0.5,
                marker: {
                    color: 'green',
                },
            },
            {
                x: samples[3],
                type: "histogram",
                opacity: 0.5,
                marker: {
                    color: 'blue',
                },
            }];

        if(verticalLayout){
            Plotly.newPlot('histoplotv', traces, layout);
        }else
            Plotly.newPlot('histoplot', traces, layout);
    }

    function nvUpdateSelectionBoxColor(rgb01) {
        setSelectionBoxColor([...rgb01, 0.5])
        nv.setSelectionBoxColor([...rgb01, 0.5])
    }

    function nvUpdateSliceType(newSliceType) {
        if (newSliceType === 'axial') {
            nv.setSliceType(nv.sliceTypeAxial)
        } else if (newSliceType === 'coronal') {
            nv.setSliceType(nv.sliceTypeCoronal)
        } else if (newSliceType === 'sagittal') {
            nv.setSliceType(nv.sliceTypeSagittal)
        } else if (newSliceType === 'multi') {
            nv.setSliceType(nv.sliceTypeMultiplanar)
        } else if (newSliceType === '3d') {
            nv.setSliceType(nv.sliceTypeRender)
        }
    }

    function nvUpdateLayerOpacity(a) {
        nv.updateGLVolume()
    }

    function nvUpdateColorMap(id, clr) {
        nv.setColorMap(id, clr)
    }

    function nvRemoveLayer(imageToRemove) {
        nv.removeVolume(imageToRemove)
        setLayers([...nv.volumes])
    }

    const selectVolume = (volumeIndex) => {
        const openVolume = ()=>{
            nv.closeDrawing();
            if(drawingEnabled)
                nvUpdateDrawingEnabled();
            if (props.volumes[selectVolume] !== undefined) {
                nv.removeVolume(props.volumes[selectedVolume]);
            }
            nv.loadVolumes([props.volumes[volumeIndex]]);
            setSelectedVolume(volumeIndex);
            setSelectedROI('');
        }
        // In case that changes has been made
        if (drawingChanged) {
            setWarningConfirmationCallback(()=>(()=>{
                saveROI(() => {
                    openVolume();
                });
            }));
            setWarningCancelCallback(()=>(()=>{
                openVolume();
            }));
            setConfirmationOpen(true);
        } else
            openVolume();
    }
    const [selectedROI, setSelectedROI] = useState('');
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveConfirmCallback, setSaveConfirmCallback] = useState(() => {
    });

    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [warningConfirmationCallback, setWarningConfirmationCallback] = useState(() => {});
    const [warningCancelCallback, setWarningCancelCallback] = useState(() => {});
    const [drawingChanged, setDrawingChanged] = useState(false);
    const selectROI = async (roiIndex) => {
        console.log(nv.drawBitmap);
        const load = () => {
            console.log(props.rois[roiIndex].link);
            console.trace();
            nv.loadDrawingFromUrl(props.rois[roiIndex].link).then((value) => {
                resampleImage();
            });
            setSelectedROI(roiIndex);
            setDrawingChanged(false);
        };
        // In case that changes has been made
        if (drawingChanged) {
            setWarningConfirmationCallback(()=>(()=>{
                saveROI(() => {
                    nv.closeDrawing();
                    nv.drawScene();
                    load();
                });
            }));
            setWarningCancelCallback(()=>(()=>{
                nv.closeDrawing();
                nv.drawScene();
                load();
            }));
            setConfirmationOpen(true);
        } else
            load();
    }
    const saveROI = (afterSaveCallback) => {
        setSaveDialogOpen(true);
        setSaveConfirmCallback(() => (async (filename) => {
            const config = {
                headers: {
                    Authorization: `Bearer ${props.accessToken}`,
                },
            };
            console.log(props);
            const response = await axios.post(ROI_UPLOAD, {
                "filename": filename,
                "pipeline_id": props.pipelineID,
                "type": "image",
                "contentType": "application/octet-stream"
            }, config);
            console.log(response.data);
            // Monkey patch object URL creation
            // Store the original URL.createObjectURL method
            const originalCreateObjectURL = URL.createObjectURL;
            // Redefine the method
            URL.createObjectURL = function (blob) {
                const file = new File([blob], filename, {
                    type: blob.type,
                    lastModified: Date.now()
                });
                // Upload to bucket
                axios.put(response.data.upload_url, file, {
                    headers: {
                        'Content-Type': file.type
                    }
                }).then(() => {
                    // Update available rois with this callback
                    props.saveROICallback();
                });
                // Call the original method and return its result
                return 'javascript:void(0);';
            };

            // False if nothing has been drawn on canvas
            let successful = await nv.saveImage(filename, true);
            // De-patch
            URL.createObjectURL = originalCreateObjectURL;
            setDrawingChanged(false);
            setSelectedROI(props.rois.length);
            if (afterSaveCallback instanceof Function)
                afterSaveCallback();
        }));
    }

    const drawToolkitProps ={ nv,
        volumes:props.volumes,
        selectedVolume,
        setSelectedVolume:selectVolume,
        updateDrawPen:nvUpdateDrawPen,
        drawPen:drawPen,
        drawingEnabled:drawingEnabled,
        setDrawingEnabled:nvSetDrawingEnabled,
        showColorBar:colorBar,
        toggleColorBar:nvUpdateColorBar,
        changesMade:drawingChanged,
        showSampleDistribution: verticalLayout,
        toggleSampleDistribution,
        showCrosshair:nvShowCrosshair,
        drawUndo:()=>{//To be moved and organized
            nv.drawUndo();
            resampleImage();
        }
    };
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        }}
        >
            <SettingsPanel
                open={openSettings}
                width={300}
                toggleMenu={toggleSettings}
            >
                <ColorPicker
                    colorRGB01={backColor}
                    onSetColor={nvUpdateBackColor}
                    title={'Background color'}
                >
                </ColorPicker>
                <ColorPicker
                    colorRGB01={clipPlaneColor}
                    onSetColor={nvUpdateClipPlaneColor}
                    title={'Clip plane color'}
                >
                </ColorPicker>
                <NumberPicker
                    value={clipPlaneOpacity}
                    onChange={nvUpdateClipPlaneOpacity}
                    title={'Clip plane opacity'}
                    min={0}
                    max={1}
                    step={0.1}
                >
                </NumberPicker>
                <ColorPicker
                    colorRGB01={crosshairColor}
                    onSetColor={nvUpdateCrosshairColor}
                    title={'Crosshair color'}
                >
                </ColorPicker>
                <NumberPicker
                    value={crosshairOpacity}
                    onChange={nvUpdateCrosshairOpacity}
                    title={'Crosshair opacity'}
                    min={0}
                    max={1}
                    step={0.1}
                >
                </NumberPicker>
                <ColorPicker
                    colorRGB01={selectionBoxColor}
                    onSetColor={nvUpdateSelectionBoxColor}
                    title={'Selection box color'}
                >
                </ColorPicker>
                <NumberPicker
                    value={nv.opts.crosshairWidth}
                    onChange={nvUpdateCrosshairSize}
                    title={'Crosshair size'}
                    min={0}
                    max={10}
                    step={1}
                >
                </NumberPicker>
                <NumberPicker
                    value={textSize}
                    onChange={nvUpdateTextSize}
                    title={'Text size'}
                    min={0}
                    max={0.2}
                    step={0.01}
                >
                </NumberPicker>
                <ColorPicker
                    colorRGB01={rulerColor}
                    onSetColor={nvUpdateRulerColor}
                    title={'Ruler color'}
                >
                </ColorPicker>
                <NumberPicker
                    value={rulerWidth}
                    onChange={nvUpdateRulerWidth}
                    title={'Ruler thickness'}
                    min={0}
                    max={10}
                    step={1}
                >
                </NumberPicker>
                <NumberPicker
                    value={rulerOpacity}
                    onChange={nvUpdateRulerOpacity}
                    title={'Ruler opacity'}
                    min={0}
                    max={1}
                    step={0.1}
                >
                </NumberPicker>
                <NumberPicker
                    value={opacity}
                    onChange={nvUpdateOpacity}
                    title={'Opacity'}
                    min={0}
                    max={1}
                    step={0.01}
                >
                </NumberPicker>
                <NumberPicker
                    value={drawOpacity}
                    onChange={nvUpdateDrawOpacity}
                    title={'Draw Opacity'}
                    min={0}
                    max={1}
                    step={0.01}
                >
                </NumberPicker>
                <label htmlFor="drawPen">Draw color:</label>
                <select name="drawPen" id="drawPen" onChange={nvUpdateDrawPen} defaultValue={drawPen}>
                    <option value="0">Erase</option>
                    <option value="1">Red</option>
                    <option value="2">Green</option>
                    <option value="3">Blue</option>
                    <option value="8">Filled Erase</option>
                    <option value="9">Filled Red</option>
                    <option value="10">Filled Green</option>
                    <option value="11">Filled Blue</option>
                    <option value="12">Erase Selected Cluster</option>
                </select>
                <Button
                    title={'Save image'}
                    onClick={nvSaveImage}
                >
                    Save image
                </ Button>
                <NVSwitch
                    checked={locationTableVisible}
                    title={'Location table'}
                    onChange={toggleLocationTable}
                >
                </NVSwitch>
                <NVSwitch
                    checked={drawingEnabled}
                    title={'Enable drawing'}
                    onChange={nvUpdateDrawingEnabled}
                >
                </NVSwitch>
                <NVSwitch
                    checked={orientCube}
                    title={'Orientation cube'}
                    onChange={nvUpdateOrientCube}
                >
                </NVSwitch>
                <NVSwitch
                    checked={ruler}
                    title={'Ruler'}
                    onChange={nvUpdateRuler}
                >
                </NVSwitch>
                <NVSwitch
                    checked={clipPlane}
                    title={'Clip plane'}
                    onChange={nvUpdateClipPlane}
                >
                </NVSwitch>
                <NVSwitch
                    checked={cornerText}
                    title={'Corner text'}
                    onChange={nvUpdateCornerText}
                >
                </NVSwitch>
                <NVSwitch
                    checked={radiological}
                    title={'radiological'}
                    onChange={nvUpdateRadiological}
                >
                </NVSwitch>
                <NVSwitch
                    checked={crosshair3D}
                    title={'3D crosshair'}
                    onChange={nvUpdateCrosshair3D}
                >
                </NVSwitch>
                <NVSwitch
                    checked={colorBar}
                    title={'Show color bar'}
                    onChange={nvUpdateColorBar}
                >
                </NVSwitch>
                <NVSwitch
                    checked={worldSpace}
                    title={'World space'}
                    onChange={nvUpdateWorldSpace}
                >
                </NVSwitch>
                <NVSwitch
                    checked={sagittalNoseLeft}
                    title={'Nose left'}
                    onChange={nvUpdateSagittalNoseLeft}
                >
                </NVSwitch>
                <NVSwitch
                    checked={dragToMeasure}
                    title={'Drag to measure'}
                    onChange={nvUpdateDragToMeasure}
                >
                </NVSwitch>
                <NVSwitch
                    checked={highDPI}
                    title={'High DPI'}
                    onChange={nvUpdateHighDPI}
                >
                </NVSwitch>
                <NumberPicker
                    value={decimalPrecision}
                    onChange={updateDecimalPrecision}
                    title={'Decimal precision'}
                    min={0}
                    max={8}
                    step={1}
                >
                </NumberPicker>
                <NumberPicker
                    value={multiplanarPadPixels}
                    onChange={nvUpdateMultiplanarPadPixels}
                    title={'Multiplanar padding'}
                    min={0}
                    max={20}
                    step={2}
                >
                </NumberPicker>
                <NumberPicker
                    value={maxDrawUndoBitmaps}
                    onChange={nvUpdateMaxDrawUndoBitmaps}
                    title={'Max Draw Undos'}
                    min={8}
                    max={28}
                    step={1}
                >
                </NumberPicker>
                <NumberPicker
                    value={longTouchTimeout}
                    onChange={nvUpdateLongTouchTimeout}
                    title={'Long touch timeout msec'}
                    min={1000}
                    max={5000}
                    step={100}
                >
                </NumberPicker>
                <NumberPicker
                    value={doubleTouchTimeout}
                    onChange={nvUpdateDoubleTouchTimeout}
                    title={'Double touch timeout msec'}
                    min={500}
                    max={999}
                    step={25}
                >
                </NumberPicker>
            </SettingsPanel>
            <LayersPanel
                open={openLayers}
                width={320}
                onToggleMenu={toggleLayers}
                onAddLayer={addLayer}
            >
                {layerList}
            </LayersPanel>
            <Toolbar
                nv={nv}
                nvUpdateSliceType={nvUpdateSliceType}
                toggleSettings={toggleSettings}
                toggleLayers={toggleLayers}
                volumes={props.volumes}
                selectedVolume={selectedVolume}
                setSelectedVolume={selectVolume}
                showColorBar={colorBar}
                toggleColorBar={nvUpdateColorBar}
                rois={props.rois}
                selectedROI={selectedROI}
                setSelectedROI={selectROI}
                verticalLayout={verticalLayout}
                toggleVerticalLayout={toggleSampleDistribution}
                showCrosshair={nvShowCrosshair}
                dragMode={dragMode}
                setDragMode={nvSetDragMode}
            />
            <Confirmation name={'New Changes Made'} message={"Consider saving your drawing before switching."}
                          open={confirmationOpen} setOpen={setConfirmationOpen} cancellable={true}
                          confirmCallback={warningConfirmationCallback}
                          cancelCallback={warningCancelCallback} cancelText={"Don't save"}
            />
            <EditConfirmation name={'Save drawings'}
                              message={'Please enter the name of the saved drawing'}
                              open={saveDialogOpen} setOpen={setSaveDialogOpen}
                              confirmCallback={saveConfirmCallback}
                              cancellable={true}
                              cancelCallback={() => {
                              }}
                              suffix={'.nii'}
                              defaultText={(props.rois[selectedROI] !== undefined ?
                                  props.rois[selectedROI].filename : undefined)}
            />
            {verticalLayout &&
                <Box style={{paddingLeft:'245px', width:'100%', marginBottom:'5pt'}}>
                    <DrawToolkit {...drawToolkitProps}
                                 style={{height:'10%'}} />
                </Box>}
            {props.volumes[selectedVolume]!=undefined && <NiivuePanel
                nv={nv}
                key={`${selectedVolume}`}
                volumes={layers}
                colorBarEnabled={colorBar}
                displayVertical={verticalLayout}

                decimalPrecision={decimalPrecision}
                locationData={locationData}
                locationTableVisible={locationTableVisible}
                pipelineID={props.pipelineID}

                resampleImage={resampleImage}
                rois = {rois}

                drawToolkitProps={drawToolkitProps}

                layerList={layerList}

                mins={boundMins}
                maxs={boundMaxs}
                mms={mms}
            />}
            <Box sx={{width: '100%',
                display:(!verticalLayout)?'none':'flex',
                height:'600pt', marginLeft:1, flexDirection:'column'}}>
                <Box
                    ref={histoRef}
                    id={'histoplotv'}
                    style={{
                        width:'100%',
                        height: '50%'
                    }}
                >
                </Box>

                <ROITable
                    pipelineID={props.pipelineID}

                    style={{
                        width:'100%',
                        height:'50%'
                    }}
                />
            </Box>
        </Box>
    )
}
