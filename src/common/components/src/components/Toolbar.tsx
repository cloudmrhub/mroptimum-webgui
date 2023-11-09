import React, {ChangeEvent, useState} from 'react'
import {Box, Button, Menu, Stack, SvgIconProps, Switch, Typography} from "@mui/material"
import {IconButton,FormControl,Select,MenuItem,InputLabel} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu'
import BrushIcon from '@mui/icons-material/Brush';
import LayersIcon from '@mui/icons-material/Layers'

import SvgIcon from '@mui/material/SvgIcon';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined';
import ImagesearchRollerIcon from '@mui/icons-material/ImagesearchRoller';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import AutoFixNormalOutlinedIcon from '@mui/icons-material/AutoFixNormalOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import {ROI} from "../../../../features/rois/roiSlice";
// import {Niivue} from "@niivue/niivue";

interface ToolbarProps {
    nv: any;
    nvUpdateSliceType: any;
    toggleLayers: React.MouseEventHandler<HTMLButtonElement> | undefined;
    toggleSettings: React.MouseEventHandler<HTMLButtonElement> | undefined;
    volumes: {url:string, name:string}[];
    selectedVolume: number;
    setSelectedVolume: (index: number)=>void;
    updateDrawPen: (e: any)=>void;
    drawPen: number;
    setDrawingEnabled:(enabled: boolean)=>void;
    drawingEnabled: boolean;
    showColorBar: boolean;
    toggleColorBar:()=>void;
    rois: ROI[];
    selectedROI: number;
    setSelectedROI: (selected:number)=>void;
    saveROI: ()=>void;
    changesMade: boolean;
    showSampleDistribution:boolean;
    toggleSampleDistribution: ()=>void;
    drawUndo: ()=>void;
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

export default function Toolbar(props:ToolbarProps) {
    const [sliceType, setSliceType] = React.useState('multi')
    const [expandDrawOptions, setExpandDrawOptions] = React.useState(false);
    const [expandEraseOptions, setExpandEraseOptions] = React.useState(false);
    const penColor = ['red','green','blue'][(props.drawPen&7)-1];
    const filled = props.drawPen>7;
    function clickPaintBrush(){
        let expand = !expandDrawOptions;
        if(expand){
            setExpandEraseOptions(false);
            props.updateDrawPen({target:{value:1}});
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

    function handleSliceTypeChange(e: { target: { value: any } }) {
        let newSliceType = e.target.value
        let nvUpdateSliceType = props.nvUpdateSliceType
        setSliceType(newSliceType)
        nvUpdateSliceType(newSliceType)
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
    return (
        <Box sx={{display:'flex', flexDirection:'column',width:'100%'}}>

            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    height: '64px',
                    flexDirection: 'row',
                    justifyItems: 'left',
                    alignItems: 'center',
                    backgroundColor: 'white',
                }}
            >

                <IconButton
                    onClick={props.toggleLayers}
                >
                    <MenuIcon/>
                </IconButton>

                <FormControl
                    size='small'
                    sx={{
                        m: 2,
                        minWidth: 120
                    }}>
                    <InputLabel id="slice-type-label">Display mode</InputLabel>
                    <Select
                        labelId="slice-type-label"
                        id="slice-type"
                        value={sliceType}
                        label="Display mode"
                        onChange={handleSliceTypeChange}
                    >
                        <MenuItem value={'axial'}>Axial</MenuItem>
                        <MenuItem value={'coronal'}>Coronal</MenuItem>
                        <MenuItem value={'sagittal'}>Sagittal</MenuItem>
                        <MenuItem value={'multi'}>Multi</MenuItem>
                        <MenuItem value={'3d'}>3D</MenuItem>
                    </Select>
                </FormControl>
                <FormControl
                    size='small'
                    sx={{
                        m: 2,
                        minWidth: 120
                    }}>
                    <InputLabel id="slice-type-label">Opened Volume</InputLabel>
                    <Select
                        labelId="slice-type-label"
                        id="slice-type"
                        value={props.selectedVolume}
                        label="Opened Volume"
                        onChange={(e)=>props.setSelectedVolume(Number(e.target.value))}
                    >
                        {props.volumes.map((value,index)=>{
                            return <MenuItem value={index}>{value.name}</MenuItem>;
                        })}
                    </Select>
                </FormControl>

                <FormControl
                    size='small'
                    sx={{
                        m: 2,
                        minWidth: 120
                    }}>
                    <InputLabel id="slice-type-label">ROI Layer</InputLabel>
                    <Select
                        labelId="slice-type-label"
                        id="slice-type"
                        value={props.selectedROI}
                        label="Opened ROIs"
                        onChange={(e)=>props.setSelectedROI(Number(e.target.value))}
                    >
                        {props.rois.map((value,index)=>{
                            return <MenuItem value={index}>{value.filename}</MenuItem>;
                        })}
                    </Select>
                </FormControl>

                <Box
                    sx={{
                        display:'flex',
                        alignItems: 'center'
                    }}
                    style={{
                        marginLeft: 'auto'
                    }}
                    m={1}
                >
                    <Typography
                    >
                        Sampling Histogram
                    </Typography>
                    <Switch
                        checked={props.showSampleDistribution}
                        onChange={props.toggleSampleDistribution}
                    />
                </Box>
                <Box
                    sx={{
                        display:'flex',
                        alignItems: 'center'
                    }}
                    m={1}
                >
                    <Typography
                        style={{
                            marginRight: 'auto'
                        }}
                    >
                        Show Color Bar
                    </Typography>
                    <Switch
                        checked={props.showColorBar}
                        onChange={props.toggleColorBar}
                    />
                </Box>
                <IconButton
                    onClick={props.toggleSettings}
                >
                    <SettingsIcon/>
                </IconButton>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    height: '64px',
                    flexDirection: 'row',
                    justifyItems: 'center',
                    alignItems: 'center',
                    // justifyContent:'center',
                    backgroundColor: 'white',
                }}>
                <FormControl>
                    <Button className={'ms-2'} variant='contained' disabled={!props.changesMade} onClick={props.saveROI}>
                        Save ROI
                    </Button>
                </FormControl>
                <FormControl>
                    <Stack direction="row" >
                        <IconButton aria-label="draw" onClick={clickPaintBrush}>
                            {(filled&&expandDrawOptions)?
                                <ImagesearchRollerIcon style={{color:penColor}}/>
                                :<BrushIcon style={{color:(props.drawingEnabled)?penColor:undefined}}/>}
                        </IconButton>
                        <Stack style={{border:`${(expandDrawOptions)?'1px':0} solid #ccc`,
                            maxWidth:(expandDrawOptions)?300:0,transition:'all 0.5s', overflow:'hidden', borderRadius:'16px'}} direction="row">
                            {options.map((value,index)=><IconButton
                                onClick={()=>{
                                    props.updateDrawPen({target:{value:index+((index>=3)?6:1)}});
                                    props.setDrawingEnabled(true);
                                }}>
                                {value}
                            </IconButton>)}
                        </Stack>
                    </Stack>
                </FormControl>

                <FormControl>
                    <Stack direction="row" >
                        <IconButton aria-label="erase" onClick={clickEraser}>
                            {(filled||!expandEraseOptions)?
                                <EraserIcon/>
                                :<AutoFixNormalOutlinedIcon/>}
                        </IconButton>
                        <Stack style={{border:`${(expandEraseOptions)?'1px':0} solid #ccc`,
                            maxWidth:(expandEraseOptions)?300:0,transition:'all 0.5s', overflow:'hidden', borderRadius:'16px'}} direction="row">
                            {eraseOptions.map((value,index)=><IconButton
                                onClick={()=>{
                                    props.updateDrawPen({target:{value:(index==0)?8:0}});
                                    props.setDrawingEnabled(true);
                                }}>
                                {value}
                            </IconButton>)}
                        </Stack>
                    </Stack>
                </FormControl>
                <FormControl>
                    <Stack direction="row" >
                        <IconButton aria-label="revert" onClick={()=>{props.drawUndo()}}>
                            <ReplyIcon/>
                        </IconButton>
                    </Stack>
                </FormControl>
            </Box>
        </Box>
    );
}

