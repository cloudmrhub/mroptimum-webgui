import React, {ChangeEvent, Fragment, useState} from 'react'
import {Box, Button, Menu, Stack, SvgIconProps, Switch, Typography} from "@mui/material"
import {IconButton,FormControl,Select,MenuItem,InputLabel} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu'
import BrushIcon from '@mui/icons-material/Brush';
import LayersIcon from '@mui/icons-material/Layers'
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SvgIcon from '@mui/material/SvgIcon';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined';
import ImagesearchRollerIcon from '@mui/icons-material/ImagesearchRoller';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import AutoFixNormalOutlinedIcon from '@mui/icons-material/AutoFixNormalOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import {ROI} from "../../../../features/rois/roiSlice";
import CmrCheckbox from "../../Cmr-components/checkbox/Checkbox";
import {createTheme} from "@mui/material/styles";
// import {Niivue} from "@niivue/niivue";

interface ToolbarProps {
    nv: any;
    nvUpdateSliceType: any;
    toggleLayers: React.MouseEventHandler<HTMLButtonElement> | undefined;
    toggleSettings: React.MouseEventHandler<HTMLButtonElement> | undefined;
    volumes: {url:string, name:string, alias:string}[];
    selectedVolume: number;
    setSelectedVolume: (index: number)=>void;
    showColorBar: boolean;
    toggleColorBar:()=>void;
    rois: ROI[];
    selectedROI: number;
    setSelectedROI: (selected:number)=>void;
    verticalLayout:boolean;
    toggleVerticalLayout: ()=>void;
    showCrosshair: (show:boolean)=>void;
    dragMode:boolean,
    setDragMode:(dragMode:string|boolean)=>void;
}

export default function Toolbar(props:ToolbarProps) {
    const [sliceType, setSliceType] = React.useState('multi')

    function handleSliceTypeChange(e: { target: { value: any } }) {
        let newSliceType = e.target.value
        let nvUpdateSliceType = props.nvUpdateSliceType
        setSliceType(newSliceType)
        nvUpdateSliceType(newSliceType)
    }

    let dragModes = ["Pan","Measurement","Contrast",'None'];

    return (
        <Box  sx={{display:'flex', flexDirection:'column',width:'100%'}}>
            {props.volumes[props.selectedVolume]!=undefined&&<Fragment>
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        flexDirection: 'row',
                        justifyItems: 'left',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        flexWrap: 'wrap',
                    }}
                >

                    <IconButton
                        size={'small'}
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
                        <InputLabel id="slice-type-label">Opened Volume</InputLabel>
                        <Select
                            labelId="slice-type-label"
                            id="slice-type"
                            value={props.selectedVolume}
                            label="Opened Volume"
                            onChange={(e)=>props.setSelectedVolume(Number(e.target.value))}
                        >
                            {props.volumes.map((value,index)=>{
                                return <MenuItem value={index}>{value.alias}</MenuItem>;
                            })}
                        </Select>
                    </FormControl>
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
                        <InputLabel id="drag-mode-label">Drag mode</InputLabel>
                        <Select
                            labelId="drag-mode-label"
                            id="drag-mode"
                            value={props.dragMode}
                            label="Display mode"
                            onChange={e=>{
                                console.log(e.target.value);
                                props.setDragMode(e.target.value);
                            }}
                        >
                            {dragModes.map((value,index) =>
                                <MenuItem key={index} value={value.toLowerCase()}>
                                    {value}
                                </MenuItem>
                            )}
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

                    <CmrCheckbox defaultChecked={true} onChange={(e)=>{
                        props.showCrosshair(e.target.checked)}}>
                        Show cross air
                    </CmrCheckbox>

                    <Box
                        sx={{
                            display:'flex',
                            alignItems: 'center'
                        }}
                        m={1}
                    >
                        <Typography
                        >
                            Vertical Layout
                        </Typography>
                        <Switch
                            checked={props.verticalLayout}
                            onChange={props.toggleVerticalLayout}
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

            </Fragment>}
        </Box>
    );
}

