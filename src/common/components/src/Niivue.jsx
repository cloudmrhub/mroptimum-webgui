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
    const [orgOpacity, setOrgOpacity] = useState(0.8);

    const [min, setMin] = useState(0);
    const [max, setMax] = useState(1);


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
        verifyComplex(nv.volumes[0]);
        let volume = nv.volumes[0];
        setMin(volume.cal_min);
        setMax(volume.cal_max);
    }

    function verifyComplex(volume){
        volume.real = new Float32Array(volume.img);

        setComplexMode('real');
        // Ensure volume.imaginary is defined and has the same length as volume.img
        if (!volume.imaginary || volume.imaginary.length !== volume.img.length) {
            setComplexOptions(['real','absolute']);

            // Initialize absolute and phase arrays
            volume.absolute = new Float32Array(volume.img.length);
            // Calculate absolute and phase values
            for (let i = 0; i < volume.img.length; i++) {
                const realPart = volume.real[i];
                // Calculate the absolute value (magnitude)
                volume.absolute[i] = Math.sqrt(realPart * realPart);
            }
            return false;
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
        setComplexOptions(['real','imaginary','absolute','phase']);
        return true;
    }

    function nvSetDisplayedVoxels(voxelType){
        setComplexMode(voxelType);
        let volume = nv.volumes[0];
        switch (voxelType){
            case 'phase':
                volume.img = volume.phase;
                break;
            case 'absolute':
                volume.img = volume.absolute;
                break;
            case 'real':
                volume.img = volume.real;
                break;
            case 'imaginary':
                volume.img = volume.imaginary;
                break;
        }
        volume.calMinMax();
        setMin(volume.cal_min);
        setMax(volume.cal_max);
        nv.setVolume(volume);
        nv.drawScene();
        resampleImage();
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

    function toggleROIVisible(){
        if(roiVisible){
            setOrgOpacity(nv.drawOpacity);
            setROIVisible(false);
            nv.setDrawOpacity(0);
            resampleImage();
        }else{
            nv.setDrawOpacity(orgOpacity);
            setROIVisible(true);
            resampleImage();
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
        nv.setCrosshairWidth(showCrosshair?0:1);
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

    function resampleImage() {
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
                title: 'Bin size',
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
        const colors = ['#bbb','#f00','#0f0','#00f','yellow','cyan','#e81ce8','#e8dbc7']
        for(let key in samples){
            let sample = samples[key];
            if(sample.length>0&&key>0){
                console.log(key);
                rois.push({
                    id:key,
                    label:key,
                    color:colors[key],
                    mu:calculateMean(sample),
                    std:calculateStandardDeviation(sample),
                    opacity:nv.drawOpacity,
                    count: sample.length
                })
            }
        }
        setROIs(rois);
        // plot a histogram of numbers
        let traces = [{
                x: samples[1],
                type: "histogram",
                name: '1',
                opacity: 0.5,
                marker: {
                    color: 'red',
                }
            },
            {
                x: samples[2],
                type: "histogram",
                opacity: 0.5,
                name: '2',
                marker: {
                    color: 'green',
                },
            },
            {
                x: samples[3],
                type: "histogram",
                name: '3',
                opacity: 0.5,
                marker: {
                    color: 'blue',
                },
            },
            {
                x: samples[4],
                type: "histogram",
                name: '4',
                opacity: 0.5,
                marker: {
                    color: 'yellow',
                },
            },
            {
                x: samples[5],
                type: "histogram",
                name: '5',
                opacity: 0.5,
                marker: {
                    color: 'cyan',
                },
            },
            {
                x: samples[6],
                type: "histogram",
                name: '6',
                opacity: 0.5,
                marker: {
                    color: '#e81ce8',
                },
            },
            {
                x: samples[7],
                type: "histogram",
                name: '7',
                opacity: 0.5,
                marker: {
                    color: '#e8dbc7',
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
        let volume = nv.volumes[0];
        setMin(volume.cal_min);
        setMax(volume.cal_max);
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

    const zipAndSendROI = function(uploadURL,filename,blob){
        let zip = new JSZip();
        let descriptor = {
            "data": [
                {
                    "filename": `${filename}.nii`,
                    "id": 1,
                    "name": filename,
                    "type": "image",
                    // "numpyPixelType": "complex64",
                    // "pixelType": "complex"
                    "labelMapping":{
                        1:'Cerebrum',
                        2:'Cerebellum'
                    }
                }
            ]
        }
        zip.file("info.json", JSON.stringify(descriptor));
        zip.file(`${filename}.nii`, blob, {base64: true});
        zip.generateAsync({type:"blob"})
            .then(function(content) {
                const file = new File([content], filename, {
                    type: blob.type,
                    lastModified: Date.now()
                });
                // Upload to bucket
                axios.put(uploadURL, file, {
                    headers: {
                        'Content-Type': file.type
                    }
                }).then(() => {
                    // Update available rois with this callback
                    props.saveROICallback();
                });
            });
    }
    const selectROI = async (roiIndex) => {
        console.log(nv.drawBitmap);
        const load = async () => {
            // console.log(props.rois[roiIndex]);
            // console.trace();

            // Fetch the file from the URL
            const response = await fetch(props.rois[roiIndex].link);

            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
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
                        resampleImage();
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
            setSelectedROI(roiIndex);
            setDrawingChanged(false);
        };
        load();
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
            setSelectedROI(roiIndex);
            setDrawingChanged(false);
        };
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
            const response = await axios.post(ROI_UPLOAD, {
                "filename": `${filename}`,
                "pipeline_id": props.pipelineID,
                "type": "image",
                "contentType": "application/octet-stream"
            }, config);
            // console.log(response.data);
            // Monkey patch object URL creation
            // Store the original URL.createObjectURL method
            const originalCreateObjectURL = URL.createObjectURL;
            // Redefine the method
            URL.createObjectURL = function (blob) {
                zipAndSendROI(response.data.upload_url,filename, blob);
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
        drawUndo:()=>{//To be moved and organized
            nv.drawUndo();
            resampleImage();
        },
        brushSize,
        updateBrushSize:nvUpdateBrushSize,
        resampleImage:resampleImage,
        roiVisible,
        toggleROIVisible
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
                refreshROI={refreshROI}
                setSelectedROI={selectROI}
                verticalLayout={verticalLayout}
                toggleVerticalLayout={toggleSampleDistribution}
                toggleShowCrosshair={nvUpdateCrosshair}
                showCrosshair={showCrosshair}
                dragMode={dragMode}
                setDragMode={nvSetDragMode}
                toggleRadiological={nvUpdateRadiological}
                radiological={radiological}
                saveROI = {saveROI}
                complexMode={complexMode}
                setComplexMode={nvSetDisplayedVoxels}
                complexOptions={complexOptions}
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

                min={min}
                max={max}
                setMin={setMin}
                setMax={setMax}
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
                />
            </Box>
        </Box>
    )
}
