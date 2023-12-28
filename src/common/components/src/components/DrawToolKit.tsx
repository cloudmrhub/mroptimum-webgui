import {Box, Button, FormControl, IconButton, Slider, Stack, SvgIconProps, Tooltip, Typography} from "@mui/material";
import ImagesearchRollerIcon from "@mui/icons-material/ImagesearchRoller";
import BrushIcon from "@mui/icons-material/Brush";
import AutoFixNormalOutlinedIcon from "@mui/icons-material/AutoFixNormalOutlined";
import ReplyIcon from "@mui/icons-material/Reply";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import React, {CSSProperties} from "react";
import {ROI} from "../../../../features/rois/resultSlice";
import SvgIcon from "@mui/material/SvgIcon";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";
import DrawPlatte from './DrawPlatte'; // Adjust the path as per your folder structure
import DeleteIcon from '@mui/icons-material/Delete';
import EraserPlatte from "./EraserPlatte";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {VisibilityOff} from "@mui/icons-material";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import OpacityIcon from '@mui/icons-material/Opacity';
import CmrTooltip from "../../Cmr-components/tooltip/Tooltip";


export interface DrawToolkitProps{
    nv: any;
    volumes: {url:string, name:string}[];
    selectedVolume: number;
    updateDrawPen: (e: any)=>void;
    drawPen: number;
    setDrawingEnabled:(enabled: boolean)=>void;
    drawingEnabled: boolean;
    rois: ROI[];
    selectedROI: number;
    setSelectedROI: (selected:number)=>void;
    saveROI: ()=>void;
    changesMade: boolean;
    drawUndo: ()=>void;
    style: CSSProperties;
    brushSize:number;
    updateBrushSize:(size:number)=>void;
    resampleImage:()=>void;
    roiVisible:boolean;
    toggleROIVisible:()=>void;

    drawingOpacity:number;
    setDrawingOpacity: (opacity:number)=>void;

    labelsVisible:boolean;
    toggleLabelsVisible: ()=>void;
}

export const DrawToolkit = (props:DrawToolkitProps)=>{
    const [expandDrawOptions, setExpandDrawOptions] = React.useState(false);
    const [expandEraseOptions, setExpandEraseOptions] = React.useState(false);
    const [expandOpacityOptions, setExpandOpacityOptions] = React.useState(false);
    const penColor = ['red','green','blue','yellow','cyan','#e81ce8'][(props.drawPen&7)-1];
    const filled = props.drawPen>7;
    function clickPaintBrush(){
        let expand = !expandDrawOptions;
        if(expand){
            setExpandEraseOptions(false);
        }
        props.setDrawingEnabled(expand||expandEraseOptions);
        setExpandDrawOptions(expand);
    }
    function clickEraser(){
        let expand = !expandEraseOptions;
        if(expand){
            props.updateDrawPen({target:{value:8}});
            setExpandDrawOptions(false);
        }
        props.setDrawingEnabled(expand||expandDrawOptions);
        setExpandEraseOptions(expand);
    }

    let options = [
        <FiberManualRecordOutlinedIcon sx={{color:'red'}}/>,
        <FiberManualRecordOutlinedIcon sx={{ color: 'green' }}/>,
        <FiberManualRecordOutlinedIcon sx={{ color: 'blue' }} />,
        <FiberManualRecordIcon sx={{color:'red'}}/>,
        <FiberManualRecordIcon sx={{ color: 'green' }}/>,
        <FiberManualRecordIcon sx={{ color: 'blue' }} />];

    let eraseOptions = [
        <FiberManualRecordIcon/>,
        <FiberManualRecordOutlinedIcon/>];

    return  <Box
        sx={{
            display: 'flex',
            width: '100%',
            flexDirection: 'row',
            justifyItems: 'center',
            alignItems: 'center',
            borderRadius:'4px',
            height:'20pt',
            // justifyContent:'center',
            backgroundColor: '#333',
        }} style={props.style}>
        {/*<FormControl>*/}
        {/*    <Button className={'ms-2'} variant='contained' disabled={!props.changesMade} onClick={props.saveROI}>*/}
        {/*        Save ROI*/}
        {/*    </Button>*/}
        {/*</FormControl>*/}
        <FormControl>
            <Stack direction="row" >
                <IconButton aria-label="draw" onClick={clickPaintBrush}>
                     <BrushIcon  style={{color:(props.drawingEnabled&&penColor!=undefined)?penColor:'white'}}/>
                </IconButton>
                <DrawPlatte
                    expandDrawOptions={expandDrawOptions}
                    updateDrawPen={props.updateDrawPen}
                    setDrawingEnabled={props.setDrawingEnabled}
                    brushSize={props.brushSize}
                    updateBrushSize={props.updateBrushSize}
                />
            </Stack>
        </FormControl>

        <FormControl>
            <Stack direction="row" >
                <IconButton aria-label="erase" onClick={clickEraser}>
                    {(filled||!expandEraseOptions)?
                        <EraserIcon style={{color:'#ddd'}}/>
                        :<AutoFixNormalOutlinedIcon style={{color:'white'}}/>}
                </IconButton>
                <EraserPlatte
                    expandEraseOptions={expandEraseOptions}
                    updateDrawPen={props.updateDrawPen}
                    setDrawingEnabled={props.setDrawingEnabled}
                    brushSize={props.brushSize}
                    updateBrushSize={props.updateBrushSize}
                />
            </Stack>
        </FormControl>
        <FormControl>
            <Stack direction="row" >
                <IconButton aria-label="revert" onClick={()=>{props.drawUndo()}}>
                    <ReplyIcon style={{color:'white'}}/>
                </IconButton>
            </Stack>
        </FormControl>
        <FormControl>
            <IconButton aria-label="capture" onClick={()=>{
                props.nv.saveScene(`${props.volumes[props.selectedVolume].name}_drawing.png`);
            }}>
                <CameraAltIcon  style={{color:'white'}}/>
            </IconButton>
        </FormControl>
        <FormControl>
            <IconButton aria-label="delete" onClick={()=>{
                // props.nv.closeDrawing();
                // props.nv.setDrawingEnabled(true);
                props.nv.clearDrawing();
                props.resampleImage();
            }}>
                <DeleteIcon  style={{color:'white'}}/>
            </IconButton>
        </FormControl>

        <Tooltip title={'Region of interests visibility'}>
            <FormControl>
                <IconButton aria-label="visible" onClick={()=>{
                    props.toggleROIVisible();
                }}>
                    {props.roiVisible?<VisibilityIcon  style={{color:'white'}}/>:
                        <VisibilityOffIcon  style={{color:'white'}}/>}
                </IconButton>
            </FormControl>
        </Tooltip>
        <FormControl style={{flexDirection:'row', alignItems:'center', color:'white'}}>
            <Tooltip title={'Region of interests opacity'}>
                <IconButton aria-label="opaque" onClick={()=>{
                    setExpandOpacityOptions(!expandOpacityOptions);
                }}>
                    <OpacityIcon style={{color:'white'}}/>
                </IconButton>

            </Tooltip>={` ${props.drawingOpacity}`}

            <OpacityPlatte drawingOpacity={props.drawingOpacity}
                           setDrawingOpacity={props.setDrawingOpacity}
                           expanded={expandOpacityOptions}/>
        </FormControl>
    </Box>;
}



/*
<option value="0">Erase</option>
          <option value="1">Red</option>
          <option value="2">Green</option>
          <option value="3">Blue</option>
          <option value="8">Filled Erase</option>
          <option value="9">Filled Red</option>
          <option value="10">Filled Green</option>
          <option value="11">Filled Blue</option>
 */
function EraserIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props} viewBox="0 0 25 25">
            <rect x="6" y="3" width="12" height="22" rx="2" ry="2" transform="rotate(230 12 12)" fill="currentColor"/>
            <rect x="7" y="4" width="10" height="8" rx="2" ry="2" transform="rotate(230 12 12)" fill="#FFFFFF"/>
        </SvgIcon>
    );
}

const OpacityPlatte = ({drawingOpacity,setDrawingOpacity,expanded}:{
    drawingOpacity:number,
    setDrawingOpacity: (opacity:number)=>void,
    expanded:boolean}) => {


    return (
        <Stack
            style={{position: 'absolute',
                top: '100%', // Position right below the IconButton
                left: 0,
                zIndex: 10, // Higher z-index to layer it above
                border: `${expanded ? '1px' : 0} solid #bbb`,
                maxWidth: expanded ? 300 : 0,
                // transition: 'all 0.5s',
                overflow: 'hidden',
                borderRadius: '16px',
                borderTopLeftRadius:'6pt',
                borderTopRightRadius:'6pt',
                background:'#333',
                width: 150
            }}
            direction="column"
        >
            <Stack sx={{ mb: 1 }} alignItems="center">

                <Typography color={'white'} noWrap gutterBottom width={'100%'} marginLeft={'10pt'}
                            fontSize={'11pt'} alignItems={'start'}>{`Opacity: ${drawingOpacity}`}</Typography>
                <Slider
                    sx={{width:'80%'}} value={drawingOpacity} step={0.01} min={0} max={1}
                    onChange={(event, value) => {
                        setDrawingOpacity(value as number);
                    }}/>
            </Stack>
        </Stack>
    );
};
