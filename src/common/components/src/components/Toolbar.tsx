import React, { ChangeEvent, Fragment, useState } from 'react'
import { Box, Button, CircularProgress, Menu, Stack, SvgIconProps, Switch, Tooltip, Typography } from "@mui/material"
import { IconButton, FormControl, Select, MenuItem, InputLabel } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import { ROI } from "../../../../features/rois/resultSlice";
import { useAppDispatch, useAppSelector } from "../../../../features/hooks";
import { getPipelineROI } from "../../../../features/rois/resultActionCreation";
import HomeIcon from '@mui/icons-material/Home';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import Brightness6Icon from '@mui/icons-material/Brightness6';
import DeleteIcon from "@mui/icons-material/Delete";
import { CmrConfirmation } from 'cloudmr-ux';
import { ROI_DELETE } from '../../../../Variables';
import axios from "axios";

interface ToolbarProps {
    nv: any;
    nvUpdateSliceType: any;
    sliceType: string;
    toggleLayers: React.MouseEventHandler<HTMLButtonElement> | undefined;
    toggleSettings: React.MouseEventHandler<HTMLButtonElement> | undefined;
    volumes: { url: string, name: string, alias: string }[];
    selectedVolume: number;
    setSelectedVolume: (index: number) => void;
    showColorBar: boolean;
    toggleColorBar: () => void;
    rois: ROI[];
    selectedROI: number;
    setSelectedROI: (selected: number) => void;
    refreshROI: () => void;
    showCrosshair: boolean;
    toggleShowCrosshair: () => void;
    // dragMode: boolean,
    dragMode: string,
    setDragMode: (dragMode: string) => void;
    radiological: boolean;
    toggleRadiological: () => void;
    saveROI: (callback: () => void, preSaving: () => void) => void;
    complexMode: string;
    setComplexMode: (complexMode: string) => void;
    complexOptions: string[];

    labelsVisible: boolean;
    toggleLabelsVisible: () => void;

    saving: boolean;
    setSaving: (saving: boolean) => void;

    resampleImage?: () => void;
}

export default function Toolbar(props: ToolbarProps) {
    const { saving, setSaving } = props;
    let dispatch = useAppDispatch();
    function handleSliceTypeChange(e: { target: { value: any } }) {
        let newSliceType = e.target.value
        let nvUpdateSliceType = props.nvUpdateSliceType
        nvUpdateSliceType(newSliceType)
    }

    // let dragModes = ["Pan","Measurement","Contrast",'None'];
    let dragModes = [
        { value: "pan", label: "Pan and Zoom" },
        { value: "measurement", label: "Measurement" },
        { value: "contrast", label: "Contrast" },
        { value: "none", label: "None" }
    ];
    let accessToken = useAppSelector(state => state.authenticate.accessToken);
    let pipeline = useAppSelector(state => state.result.activeJob?.pipeline_id);

    const [roiDeleteOpen, setRoiDeleteOpen] = useState(false);
    const [roiDeleteMsg, setRoiDeleteMsg] = useState<string | undefined>(undefined);
    const [roiDeleteConfirm, setRoiDeleteConfirm] = useState<() => void>(() => () => { });


    // const deleteROI= createAsyncThunk('DeleteROI', async (arg: { accessToken: string, jobId: string }) => {
    //     // const data = { jobId: arg.jobId }; // No need to stringify, axios will handle it
    //     const config = {
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': `Bearer ${arg.accessToken}`
    //         },
    //         params: {
    //             id: arg.jobId // Send jobId as a query parameter
    //         }
    //     };
    //     const response = await axios.delete(`${JOBS_DELETE_API}`, config);
    //     console.log(response);
    //     if (response.status == 200)
    //         getUpstreamJobs(arg.accessToken);
    // });


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {props.volumes[props.selectedVolume] != undefined && <Fragment>
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

                    {/* Temporarily hide hamburger side menu */}
                    {/* <IconButton
                        size={'small'}
                        onClick={props.toggleLayers}
                    >
                        <MenuIcon/>
                    </IconButton> */}

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
                            onChange={(e) => props.setSelectedVolume(Number(e.target.value))}
                        >
                            {props.volumes.map((value, index) => {
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
                        <InputLabel id="slice-type-label">Display Mode</InputLabel>
                        <Select
                            labelId="slice-type-label"
                            id="slice-type"
                            value={props.sliceType}
                            label="Display Mode"
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
                        <InputLabel id="drag-mode-label">Drag Mode</InputLabel>
                        <Select
                            labelId="drag-mode-label"
                            id="drag-mode"
                            value={props.dragMode}
                            label="Display mode"
                            onChange={e => {
                                console.log(e.target.value);
                                props.setDragMode(e.target.value);
                            }}
                        >
                            {dragModes.map((mode, index) => (
                                <MenuItem key={index} value={mode.value}>
                                    {mode.label}
                                </MenuItem>
                            ))}
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
                            onChange={(e) => props.setComplexMode(e.target.value)}
                        >
                            {props.complexOptions.map(value => {
                                return <MenuItem value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</MenuItem>
                            })}
                        </Select>
                    </FormControl>


                    <FormControl size="small" sx={{ m: 2, minWidth: 160 }}>
                        <InputLabel id="roi-layer-label">ROI Layer</InputLabel>
                        <Select
                            labelId="roi-layer-label"
                            id="roi-layer"
                            value={props.selectedROI}
                            label="Opened ROIs"
                            // Only text in the closed preview (no icon)
                            renderValue={(selected) => {
                                // handle no selection or invalid index
                                if (selected === undefined || selected === null || isNaN(Number(selected))) {
                                    return '';
                                }
                                const idx = Number(selected);
                                return props.rois?.[idx]?.filename ?? '';
                            }}
                            MenuProps={{
                                // optional: nicer menu width to fit long names + icon
                                PaperProps: { sx: { minWidth: 280 } },
                            }}
                        >
                            {props.rois.map((value, index) => (
                                <MenuItem
                                    key={index}
                                    value={index}
                                    onClick={() => props.setSelectedROI(Number(index))}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Box sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {value.filename}
                                    </Box>

                                    {/* Icon appears only inside the dropdown menu */}
                                    <IconButton
                                        size="small"
                                        // prevent selecting/closing when clicking the icon
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRoiDeleteMsg(`You are about to delete “${value.filename}”`);
                                            setRoiDeleteConfirm(() => {
                                                return async () => {
                                                    try {
                                                        // Make delete call to the endpoint
                                                        await axios.delete(ROI_DELETE, {
                                                            headers: {
                                                                Authorization: `Bearer ${accessToken}`,
                                                            },
                                                            data: {
                                                                roi_id: value.id,
                                                            },
                                                        });

                                                        // Refresh the ROI list
                                                        if (pipeline) {
                                                            await dispatch(getPipelineROI({ accessToken, pipeline }));
                                                        }

                                                        // Clear client drawing if we just deleted the applied ROI
                                                        if (props.selectedROI === index) {
                                                            props.nv.closeDrawing();
                                                            props.nv.drawScene?.();

                                                            // Refresh histogram + ROI table
                                                            // props.resampleImage?.();
                                                        }

                                                        console.log(`Deleted ROI: ${value.filename}`);
                                                    } catch (error) {
                                                        console.error("Failed to delete ROI:", error);
                                                    }
                                                };
                                            });
                                            setRoiDeleteOpen(true);
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>

                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <CmrConfirmation
                        name="Delete ROI Layer"
                        message={roiDeleteMsg}
                        open={roiDeleteOpen}
                        setOpen={setRoiDeleteOpen}
                        cancellable={true}
                        cancelText="Cancel"
                        confirmText="Delete"
                        color="error"
                        confirmCallback={() => {
                            roiDeleteConfirm();
                        }}
                    />

                    <Button variant={'contained'}
                        endIcon={saving && <CircularProgress sx={{ color: 'white' }} size={20} />}
                        onClick={() => {
                            if (saving)
                                return;
                            props.saveROI(async () => {
                                if (pipeline)
                                    await dispatch(getPipelineROI({ accessToken, pipeline }));
                                setSaving(false);
                            }, () => {
                                setSaving(true);
                            });
                        }}>
                        Save Drawing Layer
                    </Button>
                    <IconButton
                        onClick={props.toggleSettings}
                        style={{ marginLeft: 'auto' }}
                    >
                        <SettingsIcon />
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
                            display: 'flex',
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
                            display: 'flex',
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
                            display: 'flex',
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
                            display: 'flex',
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
                            defaultChecked={false}

                            checked={props.labelsVisible}
                            onChange={props.toggleLabelsVisible}
                        />
                    </Box>

                    <Stack flexDirection={'row'} sx={{ m: 2 }}>
                        <Tooltip title={'Reset Views'} placement={'right'}>
                            <IconButton onClick={() => props.nv.resetScene()}>
                                <HomeIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={'Recenter Views'} placement={'right'}>
                            <IconButton onClick={() => props.nv.recenter()}>
                                <CenterFocusStrongIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={'Reset Zooms'} placement={'right'}>
                            <IconButton onClick={() => props.nv.resetZoom()}>
                                <ZoomInMapIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={'Reset Contrast'} placement={'right'}>
                            <IconButton onClick={() => {
                                props.nv.resetContrast()
                                props.nv.setGamma(1.0);     // engine reset
                                props.nv.onResetGamma?.();  // UI reset: bumps gammaKey + sets gamma=1.0
                            }}
                            >
                                <Brightness6Icon />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {/* Spacer pushes zoom buttons to the far right */}
                    <Box sx={{ flex: 1 }} />

                    <Stack flexDirection={'row'} alignItems={'center'} sx={{ m: 2, gap: 0.5 }}>
                        <Tooltip title={'Zoom Out'} placement={'right'}>
                            <IconButton
                                onClick={() => {
                                    const scene = props.nv.scene;
                                    const current = scene.pan2Dxyzmm[3];
                                    const next = Math.max(0.1, current - 0.1);
                                    const delta = current - next;
                                    scene.pan2Dxyzmm[3] = next;
                                    const mm = props.nv.frac2mm(scene.crosshairPos);
                                    scene.pan2Dxyzmm[0] += delta * mm[0];
                                    scene.pan2Dxyzmm[1] += delta * mm[1];
                                    scene.pan2Dxyzmm[2] += delta * mm[2];
                                    props.nv.drawScene();
                                }}
                                size="small"
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <ZoomOutIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={'Zoom In'} placement={'right'}>
                            <IconButton
                                onClick={() => {
                                    const scene = props.nv.scene;
                                    const current = scene.pan2Dxyzmm[3];
                                    const next = current + 0.1;
                                    const delta = current - next;
                                    scene.pan2Dxyzmm[3] = next;
                                    const mm = props.nv.frac2mm(scene.crosshairPos);
                                    scene.pan2Dxyzmm[0] += delta * mm[0];
                                    scene.pan2Dxyzmm[1] += delta * mm[1];
                                    scene.pan2Dxyzmm[2] += delta * mm[2];
                                    props.nv.drawScene();
                                }}
                                size="small"
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <ZoomInIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>
            </Fragment>}
        </Box >
    );
}

