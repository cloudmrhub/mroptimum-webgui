import React, {useState} from 'react'
import {Box, Button} from '@mui/material'
import {NVImage} from '@niivue/niivue';
import {SettingsPanel} from './components/SettingsPanel.jsx'
import {NumberPicker} from './components/NumberPicker.jsx'
import {ColorPicker} from './components/ColorPicker.jsx'
import {LayersPanel} from './components/LayersPanel.jsx'
import {NiivuePanel} from './components/NiivuePanel.tsx'
import {Niivue} from './NiivuePatcher';
import NVSwitch from './components/Switch.jsx'
import Toolbar from './components/Toolbar.tsx'
import Layer from './components/Layer.jsx'
import './Niivue.css'
import EditConfirmation from "../Cmr-components/dialogue/EditConfirmation";
import axios from "axios";
import {ROI_UPLOAD} from "../../../Variables";
import Confirmation from "../Cmr-components/dialogue/Confirmation";
import {DrawToolkit} from "./components/DrawToolKit";
import Plotly from "plotly.js-dist-min";
import {ROITable} from "../../../app/results/Rois";
import {calculateMean, calculateStandardDeviation} from "./components/stats";
import JSZip from "jszip";
import {NiiFile} from "../../../features/rois/resultSlice";
import {getMax, getMin} from "../../utilities";

export const nv = new Niivue({
    loadingText: '',
    isColorbar: true,
    isRadiologicalConvention: true,
    textHeight:0.04,
    colorbarHeight:0.02,
    dragMode: 'pan',
    // crosshairColor: [0.098,0.453,0.824]
    crosshairColor: [1,1,0],
    fontColor:[0.00,0.94,0.37, 1],
    isNearestInterpolation: true,
    isFilledPen:true,
    drawPen:1
});

window.nv = nv;


// The NiiVue component wraps all other components in the UI. 
// It is exported so that it can be used in other projects easily
export default function NiiVueport(props) {
    const selectedVolume = props.selectedVolume;
    const setSelectedVolume = props.setSelectedVolume;
    const {setWarning,setWarningOpen} = props;
    // const nv = props.nv;
    const [openSettings, setOpenSettings] = React.useState(false)
    const [openLayers, setOpenLayers] = React.useState(false)
    const [crosshairColor, setCrosshairColor] = React.useState(nv.opts.crosshairColor)
    const [selectionBoxColor, setSelectionBoxColor] = React.useState(nv.opts.selectionBoxColor)
    const [backColor, setBackColor] = React.useState(nv.opts.backColor)
    const [clipPlaneColor, setClipPlaneColor] = React.useState(nv.opts.clipPlaneColor)
    const [layers, setLayers] = React.useState(nv.volumes)
    const [cornerText, setCornerText] = React.useState(false)
    const [radiological, setRadiological] = React.useState(true)
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

    const [showCrosshair, setShowCrosshair] = React.useState(true);

    const [brushSize,setBrushSize] = useState(1);
    const [complexMode, setComplexMode] = useState('real');
    const [complexOptions, setComplexOptions] = useState(['real']);
    const [roiVisible, setROIVisible] = useState(true);
    const [drawingOpacity, setDrawingOpacity] = useState(0.8);

    const [min, setMin] = useState(0);
    const [max, setMax] = useState(1);
    const [textsVisible, setTextsVisible] = useState(true);

    const [transformFactors, setTransformFactors] = useState({a: 1, b:0});

    React.useEffect(() => {
        if(props.displayVertical)
            resampleImage();
        // histogram.current?.addEventListener('resize',()=>props.resampleImage());
    }, [histoRef]);

    React.useEffect(()=>{
        window.addEventListener('resize',useState=>{
            console.log(window.innerWidth);
            if(window.innerWidth<1250&&!verticalLayout){
                setVerticalLayout(true);
            }else{
                // setVerticalLayout(false);
            }
        });
        if(window.innerWidth<1250&&!verticalLayout){
            setVerticalLayout(true);
        }else{
            setVerticalLayout(false);
        }
        if(nv.volumes.length!==0){
            setLayers([...nv.volumes]);
            setBoundMins(nv.frac2mm([0,0,0]));
            setBoundMaxs(nv.frac2mm([1,1,1]));
            setMMs(nv.frac2mm([0.5,0.5,0.5]));
            setTimeout(args => nv.resizeListener(),700);
        }
    },[]);

    React.useEffect(()=>{
        console.log(props.niis[props.selectedVolume]);
        //Wait for other rendering processes to complete  before applying styles
        stylingProxy(props.niis[props.selectedVolume]);
    },[props.selectedVolume,props.niis])

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

    const [rangeKey, setRangeKey] = useState(0);
    nv.onResetContrast = ()=>{
        setRangeKey(rangeKey+1);
    }

    let [boundMins,setBoundMins] = useState([0,0,0]);
    let [boundMaxs, setBoundMaxs] = useState([1,1,1]);
    let [mms, setMMs] = useState([0.5,0.5,0.5]);
    nv.onImageLoaded = () => {
        if(nv.volumes.length>1){
            nv.loadVolumes([niiToVolume(props.niis[props.selectedVolume])]);
            setWarning("Error loading results, please check internet connectivity");
            setWarningOpen(true);
            setTimeout(()=>{
                setWarningOpen(false);
                setWarning("");
            },2500)
            return;
        }
        console.log(nv.volumes);
        setLayers([...nv.volumes]);
        setBoundMins(nv.frac2mm([0,0,0]));
        setBoundMaxs(nv.frac2mm([1,1,1]));
        setMMs(nv.frac2mm([0.5,0.5,0.5]));
        if(verifyComplex(nv.volumes[0]))//Check if there are complex components
            nvSetDisplayedVoxels('absolute')
        else nvSetDisplayedVoxels('real');
        let volume = nv.volumes[0];
        // The following actions are performed inside nvSetDisplayedVoxels,
        // along with resizing
        // volume.calMinMax()
        // setMin(volume.cal_min);
        // setMax(volume.cal_max);
        nv.resetScene();
    }


    function checkRange(numbers) {
        console.log(numbers);
        const range_min = getMin(numbers);
        const range_max = getMax(numbers);

        const range = range_max - range_min;
        if(range == 0){
            return numbers;
        }

        if (range < 1e-2) {
            // Find a suitable 'a' that is a whole power of 10
            // Here, we want 'a' to scale the range to fit within [1, 10)
            let a = 1;
            let power = 0;
            while ((range * a) < 1) {
                a *= 10;
                power += 1;
            }

            // Calculate 'b' such that the minimum transformed value is 1 (x = 1)
            let b = Math.floor(a*range_min-a * range_min%10)/a;
            console.log(b);

            // Apply the transformation ax + b
            const transformed = numbers.map(y => a * y - a*b);
            setTransformFactors({a, b});
            nv.transformA = a;
            nv.transformB = b;
            nv.power = power;
            return transformed;
        } else {
            // If range is not smaller than 10E-2, return the original array
            setTransformFactors({a:1, b:0});
            nv.transformA = 1;
            nv.transformB = 0;
            nv.power = undefined;
            return numbers;
        }
    }


    function verifyComplex(volume){
        volume.real = volume.img;
        setComplexMode('real');
        // Ensure volume.imaginary is defined and has the same length as volume.img
        if (!volume.imaginary || volume.imaginary.length !== volume.img.length) {
            setComplexOptions(['real','absolute']);
            // Initialize absolute and phase arrays
            volume.absolute = new volume.img.constructor(volume.img.length);
            // Calculate absolute and phase values
            for (let i = 0; i < volume.img.length; i++) {
                const realPart = volume.real[i];
                // Calculate the absolute value (magnitude)
                volume.absolute[i] = Math.sqrt(realPart * realPart);
            }
            return false;
        }

        let allZero = true;
        // Test for imaginary nulls
        for (let i = 0; i < volume.img.length; i++) {
            if(volume.imaginary[i]!==0){
                allZero = false;
                break;
            }
        }

        // Initialize absolute and phase arrays
        volume.absolute = new Float32Array(volume.img.length);
        volume.phase = new Float32Array(volume.img.length);

        // Calculate absolute and phase values
        for (let i = 0; i < volume.img.length; i++) {
            const realPart = volume.real[i];
            const imaginaryPart = volume.imaginary[i];
            // Calculate the absolute value (magnitude)
            volume.absolute[i] = Math.sqrt(realPart * realPart + imaginaryPart * imaginaryPart);

            // Calculate the phase (argument)
            volume.phase[i] = Math.atan2(imaginaryPart, realPart);
        }
        setComplexOptions((allZero)?['real','absolute']:['real','imaginary','absolute','phase']);
        return !allZero;
    }

    function nvSetDisplayedVoxels(voxelType){
        setComplexMode(voxelType);
        let volume = nv.volumes[0];
        switch (voxelType){
            case 'phase':
                volume.img = checkRange(volume.phase);
                break;
            case 'absolute':
                volume.img = checkRange(volume.absolute);
                break;
            case 'real':
                volume.img = checkRange(volume.real);
                break;
            case 'imaginary':
                volume.img = checkRange(volume.imaginary);
                break;
        }
        volume.calMinMax();
        setMin(volume.cal_min);
        setMax(volume.cal_max);
        volume.vox_min = getMin(volume.img);
        volume.vox_max = getMax(volume.img);
        nv.setVolume(volume);
        nv.drawScene();
        resampleImage();
    }


    nv.onLocationChange = (data) => {
        if(data.values[0]) {
            setMMs(data.values[0].mm);
            data.values[0].transformA = nv.transformA;
            data.values[0].transformB = nv.transformB;
            data.values[0].power = nv.power;
        }
        setLocationData(data.values);
        // if(drawingEnabled){
        //     setDrawingChanged(true);
        //     // resampleImage();
        // }
        // console.log(nv.scene.pan2Dxyzmm);
    }
    nv.onMouseUp =  (data) => {
        if(drawingEnabled){
            setDrawingChanged(true);
            resampleImage();
        }
    }

    /**
     * Way to test all value changes
     */
    nv.onIntensityChange = ()=>{
        let volume = nv.volumes[0];
        setMin(volume.cal_min);
        setMax(volume.cal_max);
    }

    // nv.createEmptyDrawing();

    // construct an array of <Layer> components. Each layer is a NVImage or NVMesh
    const layerList = layers.map((layer,index) => {
        return (index===0)?(//Yuelong: we shall expect only one effective layer in this implementation
            <Layer
                key={layer.name}
                image={layer}
                nv={nv}
                nii={props.niis[props.selectedVolume]}
                onColorMapChange={nvUpdateColorMap}
                onRemoveLayer={nvRemoveLayer}
                onOpacityChange={nvUpdateLayerOpacity}
                colorMapValues={nv.colormapFromKey(layer.colormap)}
                getColorMapValues={(colorMapName) => {
                    return nv.colormapFromKey(colorMapName)
                }}
            />
        ):undefined;
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

    function toggleROIVisible(){
        if(roiVisible){
            setDrawingOpacity(nv.drawOpacity);
            setROIVisible(false);
            nv.setDrawOpacity(0);
            resampleImage();
        }else{
            nv.setDrawOpacity(drawingOpacity);
            setROIVisible(true);
            resampleImage();
        }
    }

    function nvUpdateDrawingOpacity(opacity){
        setDrawingOpacity(opacity);
        if(roiVisible){
            nv.setDrawOpacity(opacity);
        }
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

    function nvToggleLabelVisible(){
        if(textsVisible){
            nv.hideText = true;
            nv.drawScene();
            setTextsVisible(false);
        }else{
            nv.hideText = false;
            nv.drawScene();
            setTextsVisible(true);
        }
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
                nv.opts.dragMode = 3;
                break;
        }
        // nv.drawScene();
        setDragMode(dragMode);
    }

    function nvSaveImage() {
        nv.saveImage({
            filename:'roi.nii',
            isSaveDrawing: true,
        });
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
        nv.setPenValue(penValue & 7, penValue > 0);
        if (penValue == 8) {
            nv.setPenValue(0,true)
        }
    }

    function nvUpdateBrushSize(size){
        setBrushSize(size);
        nv.opts.penBounds = (size-1)/2;
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

    function nvUpdateCrosshair(){
        nv.opts.crosshairWidth = showCrosshair?0:1;
        nv.drawScene();
        setShowCrosshair(!showCrosshair);
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

    const [labelMapping, setLabelMapping] = useState({});
    function resampleImage(mapping=labelMapping) {
        let image = nv.volumes[0];
        let rois = [];
        let layout = {
            barmode: "overlay",
            title: 'ROI Histogram',  // Set your title here
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
                title: 'Bin frequency',
                showgrid: true
                // other y-axis properties
            },
            responsive:true
        }; // Set the height of the plot here};
        // Bitmap depicts the drawn content
        if(nv.drawBitmap==null){
            if(verticalLayout){
                Plotly.newPlot('histoplotv', [], layout, {responsive: true});
            }else
                Plotly.newPlot('histoplot', [], layout, {responsive: true});
            setROIs([]);
            return;
        }//If ROI (drawing) is not inside the stack

        let min = image.robust_min;
        let max = image.robust_max;
        // find and collect in an array all the cvalues in data.img euqual to 1
        // indexed by roi value
        let samples = {1:[],2:[],3:[],4:[],5:[],6:[],7:[]};
        for (let i = 0; i < nv.drawBitmap.length; i++) {
            //val&7-1 converts to r,g,b index through bit operations
            if(samples[nv.drawBitmap[i]]===undefined){
                samples[nv.drawBitmap[i]] = [];
            }
            samples[nv.drawBitmap[i]].push(image.img[i]);
        }
        if(nv.hiddenBitmap!==undefined){
            for (let i = 0; i < nv.hiddenBitmap.length; i++) {
                //val&7-1 converts to r,g,b index through bit operations
                if(samples[nv.hiddenBitmap[i]]===undefined){
                    samples[nv.hiddenBitmap[i]] = [];
                }
                samples[nv.hiddenBitmap[i]].push(image.img[i]);
            }
        }

        const colors = ['#bbb','#f00','#0f0','#00f','yellow','cyan','#e81ce8','#e8dbc7']
        for(let key in samples){
            let sample = samples[key];
            if(sample.length>0&&key>0){
                console.log(key);
                rois.push({
                    label:key,
                    alias:mapping[key]?mapping[key]:key,
                    visibility:nv.getLabelVisibility(Number(key)),
                    color:colors[key],
                    mu:calculateMean(sample),
                    std:calculateStandardDeviation(sample),
                    opacity:nv.drawOpacity,
                    count: sample.length,
                    sample:sample
                })
            }
        }
        setROIs(rois);
        // plot a histogram of numbers
        let traces = [];
        for(let roi of rois){
            // if(roi.visibility){
            traces.push({
                x: roi.sample,
                type: "histogram",
                name: roi.alias,
                opacity: roi.visibility?0.5:0.1,
                marker: {
                    color: roi.color,
                },
                autobinx:false,
                xbins: {
                    // end: max,
                    size:  (max-min)/100,
                    // start: min
                }
            });
            // }
        }
        if(verticalLayout){
            Plotly.newPlot('histoplotv', traces, layout, {responsive: true});
        }else
            Plotly.newPlot('histoplot', traces, layout, {responsive: true});
    }

    function nvUpdateSelectionBoxColor(rgb01) {
        setSelectionBoxColor([...rgb01, 0.5])
        nv.setSelectionBoxColor([...rgb01, 0.5])
    }

    const [sliceType, setSliceType] = React.useState('multi')
    function nvUpdateSliceType(newSliceType) {
        setSliceType(newSliceType);
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
        let volume = nv.volumes[0];
        setMin(volume.cal_min);
        setMax(volume.cal_max);
    }

    function nvRemoveLayer(imageToRemove) {
        nv.removeVolume(imageToRemove)
        setLayers([...nv.volumes])
    }

    function stylingProxy(nii){
        if(nii.dim === 2){
            nvUpdateSliceType('axial');
            setShowCrosshair(false);
            setTextsVisible(false);
            nv.opts.crosshairWidth = 0;
            nv.hideText = true;
            setTimeout(()=>{
                nv.setCenteredZoom(0.7)
            },300)
        }else{
            nvUpdateSliceType('multi');
            setShowCrosshair(true);
            setTextsVisible(true);
            nv.opts.crosshairWidth = 1;
            nv.hideText = false;
        }
    }

    const selectVolume = async (volumeIndex) => {
        const openVolume = async ()=>{
            nv.closeDrawing();
            setDrawingChanged(false);
            if(drawingEnabled)
                nvUpdateDrawingEnabled();
            if (props.niis[selectVolume] !== undefined) {
                nv.removeVolume(niiToVolume(props.niis[selectedVolume]));
            }
            try{
                await nv.loadVolumes([niiToVolume(props.niis[volumeIndex])]);
            }catch (e) {
                setWarning("Error loading results, please check internet connectivity");
                setWarningOpen(true);
                setTimeout(()=>{
                    setWarningOpen(false);
                    setWarning("");
                },2500)
                return;
            }
            setSelectedVolume(volumeIndex);
            setSelectedDrawingLayer('');
        }
        // In case that changes has been made
        if (drawingChanged) {
            setWarningConfirmationCallback(()=>(()=>{
                saveDrawingLayer(() => {
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
    const [selectedROI, setSelectedDrawingLayer] = useState('');
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveConfirmCallback, setSaveConfirmCallback] = useState(() => {
    });

    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [warningConfirmationCallback, setWarningConfirmationCallback] = useState(() => {});
    const [warningCancelCallback, setWarningCancelCallback] = useState(() => {});
    const [drawingChanged, setDrawingChanged] = useState(false);

    const setLabelAlias = function(label,alias){
        labelMapping[label] = alias;
        setLabelMapping(labelMapping);
        resampleImage(labelMapping);
    }
    const zipAndSendDrawingLayer = async function(uploadURL,filename,blob){
        let zip = new JSZip();
        let descriptor = {
            "data": [
                {
                    "filename": `${filename}.nii`,
                    "id": 1,
                    "name": filename,
                    "type": 'image',
                    // "numpyPixelType": "complex64",
                    // "pixelType": "complex"
                    "labelMapping":labelMapping
                }
            ]
        }
        zip.file("info.json", JSON.stringify(descriptor));
        zip.file(`${filename}.nii`, blob, {base64: true});
        let content = await zip.generateAsync({type:"blob"});
        const file = new File([content], filename, {
            type: content.type,
            lastModified: Date.now()
        });
        // Upload to bucket
        await axios.put(uploadURL, file, {
            headers: {
                'Content-Type': "application/octet-stream"
            }
        });
    }

    const unzipAndRenderDrawingLayer = async (accessURL) => {
        // console.log(props.rois[roiIndex]);
        // console.trace();

        // Fetch the file from the URL
        const response = await fetch(accessURL);

        // Check if the request was successful
        if (!response.ok) {
            props.warn('Failed to load the requested ROI Layer (was not properly saved)')
            return;
        }
        // Convert the response to a Blob
        const blob = await response.blob();
        // Create a new JSZip instance
        const zip = new JSZip();
        await zip.loadAsync(blob);

        // Check if info.js exists in the zip
        const fileInfo = zip.file("info.json");
        if (fileInfo) {
            // Read the content of info.js
            const content = await fileInfo.async("string");
            let info = JSON.parse(content);
            let niiFilePath = info.data[0].filename;
            const niiDrawing = zip.file(niiFilePath);
            if (niiDrawing) {
                // Read the content as a blob
                const base64 = await niiDrawing.async("base64");
                console.log(niiFilePath);
                nv.loadDrawingFromBase64(niiFilePath,base64).then((value) => {
                    setLabelMapping(info.data[0].labelMapping);
                    resampleImage(info.data[0].labelMapping);
                });

            } else {
                console.log(`${niiFilePath} not found in the ZIP file.`);
                return null;
            }
            // return content;
        } else {
            console.log("info.json not found in the ZIP file.");
            return null;
        }
    };
    // This is a small fix that prevents the selected roi index from jumping to
    // the newest saved roi after user has performed a roi reselection during
    // roi saving
    const [selectedDuringSaving, setSelectedDuringSaving]= useState(false);
    const selectDrawingLayer = async (roiIndex) => {
        // console.log(nv.drawBitmap);
        await unzipAndRenderDrawingLayer(props.rois[roiIndex].link);
        setSelectedDrawingLayer(roiIndex);
        setSelectedDuringSaving(true);
        setDrawingChanged(false);
    }
    const unpackROI = async (accessURL)=>{
        await unzipAndRenderDrawingLayer(accessURL);
        setDrawingChanged(false);
        setSelectedDrawingLayer(props.rois.length);
    }
    const refreshROI = async () => {
        let roiIndex = selectedROI;
        console.log(nv.drawBitmap);
        const load = () => {
            console.log(props.rois[roiIndex].link);
            console.trace();
            nv.loadDrawingFromUrl(props.rois[roiIndex].link).then((value) => {
                resampleImage();
            });
            setSelectedDrawingLayer(roiIndex);
            setDrawingChanged(false);
        };
        load();
    }

    const saveDrawingLayer = (afterSaveCallback,preSaveCallback=()=>{}) => {
        setSaveDialogOpen(true);
        setSaveConfirmCallback(() => (async (filename) => {
            preSaveCallback();
            const config = {
                headers: {
                    Authorization: `Bearer ${props.accessToken}`,
                },
            };
            const response = await axios.post(ROI_UPLOAD, {
                "filename": `${filename}`,
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
                console.log('saving blob');
                console.log(blob);
                setSelectedDuringSaving(false);
                zipAndSendDrawingLayer(response.data.upload_url,filename, blob).then(async ()=>{
                    // Update available rois with this callback
                    // props.saveROICallback();
                    setDrawingChanged(false);
                    if (afterSaveCallback instanceof Function)
                        await afterSaveCallback();
                    if(!selectedDuringSaving)//Only switch to the newest roi when user hasn't performed reselection
                        // during the period
                        setSelectedDrawingLayer(props.rois.length);
                });
                // Call the original method and return its result
                return 'javascript:void(0);';
            };

            // False if nothing has been drawn on canvas
            let successful = nv.saveImage({
                filename,
                isSaveDrawing: true,
            });
            // De-patch
            URL.createObjectURL = originalCreateObjectURL;
        }));
    }

    const drawToolkitProps ={ nv,
        volumes:props.niis.map(niiToVolume),
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
        drawUndo:()=>{//To be moved and organized
            nv.drawUndo();
            resampleImage();
        },
        brushSize,
        updateBrushSize:nvUpdateBrushSize,
        resampleImage:resampleImage,
        roiVisible,
        toggleROIVisible,
        drawingOpacity,
        setDrawingOpacity:nvUpdateDrawingOpacity
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
                sliceType={sliceType}

                toggleSettings={toggleSettings}
                toggleLayers={toggleLayers}
                volumes={props.niis.map(niiToVolume)}
                selectedVolume={selectedVolume}
                setSelectedVolume={selectVolume}
                showColorBar={colorBar}
                toggleColorBar={nvUpdateColorBar}
                rois={props.rois}
                selectedROI={selectedROI}
                refreshROI={refreshROI}
                setSelectedROI={selectDrawingLayer}
                verticalLayout={verticalLayout}
                toggleVerticalLayout={toggleSampleDistribution}
                toggleShowCrosshair={nvUpdateCrosshair}
                showCrosshair={showCrosshair}
                dragMode={dragMode}
                setDragMode={nvSetDragMode}
                toggleRadiological={nvUpdateRadiological}
                radiological={radiological}
                saveROI = {saveDrawingLayer}
                complexMode={complexMode}
                setComplexMode={nvSetDisplayedVoxels}
                complexOptions={complexOptions}

                labelsVisible={textsVisible}
                toggleLabelsVisible={nvToggleLabelVisible}
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
                // suffix={'.zip'}
                              defaultText={(props.rois[selectedROI] !== undefined ?
                                  props.rois[selectedROI].filename : undefined)}
            />
            {verticalLayout &&
                <Box style={{paddingLeft:'253px', width:'100%', marginBottom:'5pt'}}>
                    <DrawToolkit {...drawToolkitProps}
                                 style={{height:'30pt'}} />
                </Box>}
            {props.niis[selectedVolume]!=undefined && <NiivuePanel
                nv={nv}
                key={`${selectedVolume}`}
                volumes={layers}
                colorBarEnabled={colorBar}
                displayVertical={verticalLayout}
                transformFactors={transformFactors}

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

                min={min}
                max={max}
                setMin={setMin}
                setMax={setMax}
                rangeKey={rangeKey}

                unzipAndRenderROI={unpackROI}
                zipAndSendROI={zipAndSendDrawingLayer}
                setLabelAlias={setLabelAlias}
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
                    rois={rois}
                    style={{
                        width:'100%',
                        height:'50%'
                    }}
                    nv={nv}
                    resampleImage={resampleImage}
                    unpackROI={unpackROI}
                    zipAndSendROI={zipAndSendDrawingLayer}
                    setLabelAlias={setLabelAlias}
                />
            </Box>
        </Box>
    )
}


function niiToVolume(nii){
    return {
        //URL is for NiiVue blob loading
        url: nii.link,
        //name is for NiiVue name replacer (needs proper extension like .nii)
        name: (nii.filename.split('/').pop()),
        //alias is for user selection in toolbar
        alias: nii.name
    };
}