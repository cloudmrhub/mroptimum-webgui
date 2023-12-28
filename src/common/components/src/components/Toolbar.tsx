import React, {ChangeEvent, Fragment, useState} from 'react'
import {Box, Button, CircularProgress, Menu, Stack, SvgIconProps, Switch, Tooltip, Typography} from "@mui/material"
import {IconButton,FormControl,Select,MenuItem,InputLabel} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import {ROI} from "../../../../features/rois/resultSlice";
import {useAppDispatch, useAppSelector} from "../../../../features/hooks";
import {getPipelineROI} from "../../../../features/rois/resultActionCreation";
import HomeIcon from '@mui/icons-material/Home';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import Brightness6Icon from '@mui/icons-material/Brightness6';
// import {Niivue} from "@niivue/niivue";

interface ToolbarProps {
    nv: any;
    nvUpdateSliceType: any;
    sliceType: string;

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
    refreshROI: ()=>void;
    verticalLayout:boolean;
    toggleVerticalLayout: ()=>void;
    showCrosshair: boolean;
    toggleShowCrosshair:()=>void;
    dragMode:boolean,
    setDragMode:(dragMode:string|boolean)=>void;
    radiological:boolean;
    toggleRadiological:()=>void;
    saveROI:(callback: ()=>void,preSaving:()=>void)=>void;
    complexMode: string;
    setComplexMode:(complexMode:string)=>void;
    complexOptions:string[];

    labelsVisible:boolean;
    toggleLabelsVisible:()=>void;
}

export default function Toolbar(props:ToolbarProps) {
    const [saving,setSaving] = React.useState(false);
    let dispatch = useAppDispatch();
    function handleSliceTypeChange(e: { target: { value: any } }) {
        let newSliceType = e.target.value
        let nvUpdateSliceType = props.nvUpdateSliceType
        nvUpdateSliceType(newSliceType)
    }

    let dragModes = ["Pan","Measurement","Contrast",'None'];
    let accessToken = useAppSelector(state => state.authenticate.accessToken);
    let pipeline = useAppSelector(state => state.result.activeJob?.pipeline_id);
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
                            value={props.sliceType}
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
                        <InputLabel id="slice-type-label">Complex Mode</InputLabel>
                        <Select
                            labelId="slice-type-label"
                            id="slice-type"
                            value={props.complexMode}
                            label="Opened ROIs"
                            onChange={(e)=>props.setComplexMode(e.target.value)}
                        >
                            {props.complexOptions.map(value=>{
                                return <MenuItem value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</MenuItem>
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
                            // onChange={(e)=>}
                        >
                            {props.rois.map((value,index)=>{
                                return <MenuItem value={index} onClick={()=>props.setSelectedROI(Number(index))}>{value.filename}</MenuItem>;
                            })}
                        </Select>
                    </FormControl>
                    <Button variant={'contained'}
                            endIcon={saving && <CircularProgress sx={{color:'white'}} size={20} />}
                            onClick={()=>{
                        props.saveROI(()=>{
                            //@ts-ignore
                            dispatch(getPipelineROI({accessToken,pipeline}));
                            setSaving(false);
                        },()=>{
                            setSaving(true);
                        });
                    }}>
                        Save Drawing Layer
                    </Button>
                    <IconButton
                        onClick={props.toggleSettings}
                        style={{marginLeft:'auto'}}
                    >
                        <SettingsIcon/>
                    </IconButton>
                </Box>
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
                            Neurological
                        </Typography>
                        <Switch
                            defaultChecked={false}
                            checked={!props.radiological}
                            onChange={props.toggleRadiological}
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
                            Show Crosshair
                        </Typography>
                        <Switch
                            defaultChecked={true}
                            checked={props.showCrosshair}
                            onChange={props.toggleShowCrosshair}
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
                            Labels Visible
                        </Typography>
                        <Switch
                            checked={props.labelsVisible}
                            onChange={props.toggleLabelsVisible}
                        />
                    </Box>

                    <Stack flexDirection={'row'} sx={{m:2}}>
                        <Tooltip title={'Reset Views'} placement={'right'}>
                            <IconButton onClick={()=>props.nv.resetScene()}>
                                <HomeIcon/>
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={'Recenter Views'} placement={'right'}>
                            <IconButton onClick={()=>props.nv.recenter()}>
                                <CenterFocusStrongIcon/>
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={'Reset Zooms'} placement={'right'}>
                            <IconButton onClick={()=>props.nv.resetZoom()}>
                                <ZoomInMapIcon/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={'Reset Contrast'} placement={'right'}>
                            <IconButton onClick={()=>props.nv.resetContrast()}>
                                <Brightness6Icon/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>
            </Fragment>}
        </Box>
    );
}

