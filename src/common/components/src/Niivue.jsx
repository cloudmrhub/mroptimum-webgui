import React, {useState} from 'react'
import { Button, Typography } from '@mui/material'
import { Box } from '@mui/material'
import { Fade} from '@mui/material'
import { Popper } from '@mui/material'
import { Paper } from '@mui/material'
import { Niivue, NVImage} from '@niivue/niivue'
import Toolbar from './components/Toolbar.tsx'
import {SettingsPanel} from './components/SettingsPanel.jsx'
import {ColorPicker} from './components/ColorPicker.jsx'
import {NumberPicker} from './components/NumberPicker.jsx'
import { LayersPanel } from './components/LayersPanel.jsx'
import { NiivuePanel } from './components/NiivuePanel.jsx'
import NVSwitch from './components/Switch.jsx'
import LocationTable from './components/LocationTable.jsx'
import Layer from './components/Layer.jsx'
import './Niivue.css'
import EditConfirmation from "../Cmr-components/dialogue/EditConfirmation";
import axios from "axios";
import {ROI_UPLOAD} from "../../../Variables";

export const nv = new Niivue({
  loadingText: '',
  isColorbar: true
})

// The NiiVue component wraps all other components in the UI. 
// It is exported so that it can be used in other projects easily
export default function NiiVue(props) {
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
  const [drawingEnabled, setDrawingEnabled] = React.useState(nv.opts.drawingEnabled)
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

  nv.onImageLoaded = ()=>{
    setLayers([...nv.volumes])
  }
  nv.onLocationChange = (data)=>{
    setLocationData(data.values)
  }
  // nv.createEmptyDrawing();

  // construct an array of <Layer> components. Each layer is a NVImage or NVMesh 
  const layerList = layers.map((layer) => {
    return (
      <Layer
        key={layer.name} 
        image={layer}
        onColorMapChange={nvUpdateColorMap}
        onRemoveLayer={nvRemoveLayer}
        onOpacityChange={nvUpdateLayerOpacity}
        colorMapValues={nv.colormapFromKey(layer.colormap)}
        getColorMapValues={(colorMapName)=>{return nv.colormapFromKey(colorMapName)}}
      />
    )
  });

  async function addLayer(file){
    const nvimage = await NVImage.loadFromFile({
      file: file
    })
    nv.addVolume(nvimage)
    setLayers([...nv.volumes])
  }

  function toggleSettings(){
    setOpenSettings(!openSettings)
  }

  function toggleLayers(){
    setOpenLayers(!openLayers)
  }

  function toggleLocationTable(){
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

  function nvSaveImage() {
    nv.saveImage('roi.nii', true);
  }

  function nvUpdateDrawingEnabled(){
    setDrawingEnabled(!drawingEnabled)
    nv.setDrawingEnabled(!drawingEnabled)
    nv.drawScene()
  }

  function nvSetDrawingEnabled(enabled){
    setDrawingEnabled(enabled)
    nv.setDrawingEnabled(enabled)
    nv.drawScene()
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
    nv.setDrawOpacity(a)
  }

  function nvUpdateCrosshairColor(rgb01, a=1){
    setCrosshairColor([...rgb01, a])
    nv.setCrosshairColor([...rgb01, a])
  }

  function nvUpdateOrientCube(){
    nv.opts.isOrientCube = !orientCube
    setOrientCube(!orientCube)
    nv.drawScene()
  }

  function nvUpdateHighDPI(){
    nv.setHighResolutionCapable(!highDPI)
    setHighDPI(!highDPI)
  }

  function nvUpdateMultiplanarPadPixels(v){
    nv.opts.multiplanarPadPixels = v
    setMultiplanarPadPixels(v)
    nv.drawScene()
  }

  function nvUpdateRuler(){
    nv.opts.isRuler = !ruler
    setRuler(!ruler)
    nv.drawScene()
  }

  function nvUpdateSagittalNoseLeft(){
    nv.opts.sagittalNoseLeft = !sagittalNoseLeft
    setSagittalNoseLeft(!sagittalNoseLeft)
    nv.drawScene()
  }

  function nvUpdateRulerWidth(v){
    nv.opts.rulerWidth = v
    setRulerWidth(v)
    nv.drawScene()
  }

  function nvUpdateRulerOpacity(a){
    nv.opts.rulerColor = [
      rulerColor[0],
      rulerColor[1],
      rulerColor[2],
      a
    ]
    setRulerOpacity(a)
    nv.drawScene()
  }

  function nvUpdateLongTouchTimeout(v){
    nv.opts.longTouchTimeout = v
    setLongTouchTimeout(v)
  }

  function nvUpdateDoubleTouchTimeout(v){
    nv.opts.doubleTouchTimeout = v
    setDoubleTouchTimeout(v)
  }

  function nvUpdateDragToMeasure(){
    nv.opts.isDragShowsMeasurementTool = !dragToMeasure
    setDragToMeasure(!dragToMeasure)
  }

  function nvUpdateMaxDrawUndoBitmaps(v){
    nv.opts.maxDrawUndoBitmaps = v
    setMaxDrawUndoBitmaps(v)
  }

  function nvUpdateBackColor(rgb01, a=1){
    setBackColor([...rgb01, a])
    nv.opts.backColor = [...rgb01, a]
    nv.drawScene()
  }

  function nvUpdateRulerColor(rgb01, a=1){
    setRulerColor([...rgb01, a])
    nv.opts.rulerColor = [...rgb01, a]
    if (!ruler){
      nv.opts.isRuler = !ruler
      setRuler(!ruler)
    }
    nv.drawScene()
  }

  function nvUpdateClipPlaneColor(rgb01, a=1){
    setClipPlaneColor([...rgb01, a])
    nv.opts.clipPlaneColor = [...rgb01, a]
    setClipPlane(true)
    nv.setClipPlane([0, 270, 0]) //left
    nv.updateGLVolume()
  }

  function nvUpdateClipPlane(){
    if (!clipPlane){
      setClipPlane(true)
      nv.setClipPlane([0, 270, 0]) //left
    } else {
      setClipPlane(false)
      nv.setClipPlane([2, 0, 0]) //none
    }
  }

  function nvUpdateColorBar(){
    setColorBar(!colorBar)
    nv.opts.isColorbar = !colorBar
    nv.drawScene()
  }

  function nvUpdateTextSize(v) {
    setTextSize(v)
    nv.opts.textHeight = v
    nv.drawScene()
  }

  function updateDecimalPrecision(v){
    setDecimalPrecision(v)
  }

  function nvUpdateWorldSpace(){
    nvUpdateCrosshair3D(!worldSpace)
    setWorldSpace(!worldSpace)
    nv.setSliceMM(!worldSpace)
  }

  function nvUpdateCornerText(){
    nv.setCornerOrientationText(!cornerText)
    setCornerText(!cornerText)
  }

  function nvUpdateCrosshair3D(){
    nv.opts.show3Dcrosshair = !crosshair3D
    nv.updateGLVolume()
    setCrosshair3D(!crosshair3D)
  }

  function nvUpdateRadiological(){
    nv.setRadiologicalConvention(!radiological)
    setRadiological(!radiological)
  }

  function nvUpdateCrosshairOpacity(a){
    nv.setCrosshairColor([
      crosshairColor[0],
      crosshairColor[1],
      crosshairColor[2],
      a
    ])
    setCrosshairOpacity(a)
  }

  function nvUpdateClipPlaneOpacity(a){
    nv.opts.clipPlaneColor = [
      clipPlaneColor[0],
      clipPlaneColor[1],
      clipPlaneColor[2],
      a
    ]
    setClipPlaneOpacity(a)
    nv.updateGLVolume()
  }

  function nvUpdateCrosshairSize(w){
    nv.opts.crosshairWidth = w
    nv.drawScene()
  }

  function nvUpdateSelectionBoxColor(rgb01){
    setSelectionBoxColor([...rgb01, 0.5])
    nv.setSelectionBoxColor([...rgb01, 0.5])
  }

  function nvUpdateSliceType(newSliceType) {
    if (newSliceType === 'axial'){
      nv.setSliceType(nv.sliceTypeAxial)    
    } else if (newSliceType === 'coronal'){
      nv.setSliceType(nv.sliceTypeCoronal)
    } else if (newSliceType === 'sagittal'){
      nv.setSliceType(nv.sliceTypeSagittal)
    } else if (newSliceType === 'multi'){
      nv.setSliceType(nv.sliceTypeMultiplanar)
    } else if (newSliceType === '3d'){
      nv.setSliceType(nv.sliceTypeRender)
    }
  }

  function nvUpdateLayerOpacity(a) {
    nv.updateGLVolume()
  }

  function nvUpdateColorMap(id, clr){
    nv.setColorMap(id, clr)
  }

  function nvRemoveLayer(imageToRemove){
    nv.removeVolume(imageToRemove)
    setLayers([...nv.volumes])
  }

	nv.on('intensityRange', (nvimage) => {
		//setIntensityRange(nvimage)
	})
  const [selectedVolume, setSelectedVolume] = useState(0);
  const selectVolume = (volumeIndex)=>{
    if(props.volumes[selectVolume]!==undefined){
      nv.removeVolume(props.volumes[selectedVolume]);
    }
    nv.loadVolumes([props.volumes[volumeIndex]]);
    setSelectedVolume(volumeIndex);
  }
  const [selectedROI, setSelectedROI] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveConfirmCallback, setSaveConfirmCallback] = useState(()=>{});
  const selectROI = async (roiIndex)=>{
    console.log(nv.drawBitmap);
    const load = ()=>{
      if(roiIndex!==props.rois.length){
        console.log(props.rois[roiIndex].link);
        nv.loadDrawingFromUrl(props.rois[roiIndex].link).then((value)=>{
          console.log(value);
        });
      }
      setSelectedROI(roiIndex);
    };
    if(nv.drawBitmap!=null){//If drawing exists
      saveROI(()=>{
        nv.closeDrawing();
        // nv.removeVolumeByUrl(props.rois[selectedROI].link);
        console.log(nv.volumes);
        nv.drawScene();
        load();
      });
    }else
      load();
  }
  const saveROI = (afterSaveCallback)=>{
    setSaveDialogOpen(true);
    setSaveConfirmCallback(()=>(async (filename)=>{
      const config = {
        headers: {
          Authorization: `Bearer ${props.accessToken}`,
        },
      };
      const response = await axios.post(ROI_UPLOAD,{
        "filename": filename,
        "pipeline_id": props.pipelineID,
        "type": "image",
        "contentType": "application/octet-stream"
      },config);
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
        }).then(()=>{
          // Update available rois with this callback
          props.saveROICallback();
        });
        // Call the original method and return its result
        return 'javascript:void(0);';
      };

      // False if nothing has been drawn on canvas
      let successful = await nv.saveImage(filename,true);
      // De-patch
      URL.createObjectURL = originalCreateObjectURL;
      afterSaveCallback();
    }));
  }
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      background:'black'
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
        nvUpdateSliceType={nvUpdateSliceType}
        toggleSettings={toggleSettings}
        toggleLayers={toggleLayers}
        volumes={props.volumes}
        selectedVolume={selectedVolume}
        setSelectedVolume={selectVolume}
        updateDrawPen={nvUpdateDrawPen}
        drawPen={drawPen}
        drawingEnabled={drawingEnabled}
        setDrawingEnabled={nvSetDrawingEnabled}
        showColorBar={colorBar}
        toggleColorBar={nvUpdateColorBar}
        rois={props.rois}
        selectedROI={selectedROI}
        setSelectedROI={selectROI}
        saveROI = {saveROI}
      />
      <EditConfirmation name={'Save drawings'}
                        message={'Would you like to save the current ROI?'}
                        open={saveDialogOpen} setOpen={setSaveDialogOpen}
                        confirmCallback={saveConfirmCallback}
                        cancellable={true}
                        cancelCallback={()=>{}}
                        suffix={'.nii'}
                        defaultText={(props.rois[selectedROI]!==undefined?
                            props.rois[selectedROI].filename:undefined)}
      />
      <NiivuePanel
        nv={nv}
        key = {selectedVolume}
        volumes={layers}
        colorBarEnabled={colorBar}
      >
      </NiivuePanel>
      <LocationTable 
        tableData={locationData} 
        isVisible={locationTableVisible}
        decimalPrecision={decimalPrecision}
      />
    </Box>
  )
}
