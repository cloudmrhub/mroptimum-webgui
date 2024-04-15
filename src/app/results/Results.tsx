import React, {Fragment, useEffect, useState} from 'react';
import './Results.scss';
import CmrCollapse from '../../common/components/Cmr-components/collapse/Collapse';
import CmrPanel from '../../common/components/Cmr-components/panel/Panel';
import CmrTable from '../../common/components/CmrTable/CmrTable';
import {getUploadedData} from '../../features/data/dataActionCreation';
import {useAppDispatch, useAppSelector} from '../../features/hooks';
import IconButton from "@mui/material/IconButton";
import GetAppIcon from "@mui/icons-material/GetApp";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NiiVue, {nv} from "../../common/components/src/Niivue";
import {Job} from "../../features/jobs/jobsSlice";
import {getUpstreamJobs, uploadJob} from "../../features/jobs/jobActionCreation";
import {resultActions, ROI} from "../../features/rois/resultSlice";
import {getPipelineROI, loadResult} from "../../features/rois/resultActionCreation";
import {Alert, Button, CircularProgress, Slide, Snackbar} from "@mui/material";
import CmrCheckbox from "../../common/components/Cmr-components/checkbox/Checkbox";
import {Row} from "antd";
import Box from "@mui/material/Box";
import {SetupInspection} from "./SetupInspection";
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import {Logs} from "./Logs";
import CmrUpload, {LambdaFile} from "../../common/components/Cmr-components/upload/Upload";
import {AxiosRequestConfig} from "axios";
import {DATAUPLODAAPI} from "../../Variables";
import {processJobZip} from "./PreprocessJob";
import {uploadHandlerFactory} from "../../features/SystemUtilities";
import CmrInput from "../../common/components/Cmr-components/input/Input";
import CmrNameDialog from "../../common/components/Cmr-components/rename/edit";
import EditConfirmation from "../../common/components/Cmr-components/dialogue/EditConfirmation";

export interface NiiFile {
    filename: string;
    id: number;
    dim: number;
    name: string;
    type: string;
    link: string;
}

const Results = ({visible}:{visible?:boolean}) => {
    const dispatch = useAppDispatch();
    const {accessToken, queueToken} = useAppSelector((state) => state.authenticate);
    const results = useAppSelector((state) =>
        state.jobs.jobs);
    const jobsLoading = useAppSelector(state => state.jobs.loading);
    // const [rois, setROIS] = useState<ROI[]>([]);
    const activeJob = useAppSelector(state => state.result.activeJob);
    const activeJobAlias = useAppSelector((state) => state.result.activeJob?.alias);
    const pipelineID = useAppSelector(state => state.result.activeJob?.pipeline_id);
    const niis = useAppSelector(state => pipelineID ? state.result.niis[pipelineID] : []);
    const rois: ROI[] = useAppSelector(state => {
        return (pipelineID == undefined || state.result.rois[pipelineID] == undefined) ? [] : state.result.rois[pipelineID];
    })
    const selectedVolume = useAppSelector(state => state.result.selectedVolume);
    const resultLoading = useAppSelector(state => state.result.resultLoading);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const openPanel = useAppSelector(state => state.result.openPanel);
    const [warning, setWarning] = useState("");
    const [warningOpen, setWarningOpen] = useState(false);

    const [showingLogs, setShowingLogs] = useState(false);

    useEffect(() => {
        //@ts-ignore
        dispatch(getUploadedData(accessToken));
        //@ts-ignore
        dispatch(getUpstreamJobs(accessToken));

        let interval = setInterval(() => {
            if (visible&&autoRefresh&&openPanel.indexOf(0) >= 0) {
                //@ts-ignore
                dispatch(getUpstreamJobs(accessToken));
            }
        }, 15000);
        return ()=>{
            clearInterval(interval);
        }
    }, [visible]);

    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const warn=(message:string)=>{

        setWarning(message);
        setWarningOpen(true);
        setTimeout(() => {
            setWarningOpen(false);
            setWarning("");
        }, 5000)
    }

    const getAlias = async(alias: string)=>{
        setOriginalName(alias);
        setNameDialogOpen(true);
        return new Promise<string>( (resolve, reject) => {
            const callback = async (value:string)=>{
                resolve(value);
                return true;
            }
            const cancelCallback = async (_:string) => {
                reject(alias);
                return true;
            }
            setRenamingCallback(()=>callback);
            setCancelCallback(()=>cancelCallback);
        });
    }

    const completedJobsColumns = [
        {
            headerName: 'Job ID',
            dataIndex: 'id',
            field: 'id',
            flex: 1,
        },
        {
            headerName: 'Alias',
            dataIndex: 'alias',
            field: 'alias',
            flex: 3,
        },
        {
            headerName: 'Date Submitted',
            dataIndex: 'createdAt',
            field: 'createdAt',
            flex: 2,
        },
        {
            headerName: 'Status',
            dataIndex: 'status',
            field: 'status',
            flex: 1,
        },
        {
            field: 'action',
            headerName: 'Action',
            sortable: false,
            width: 160,
            disableClickEventBubbling: true,
            renderCell: (params: { row: Job }) => {
                return (
                    <div>
                        <IconButton disabled={params.row.status != 'completed'} onClick={(event) => {
                            event.stopPropagation();
                            if (params.row.pipeline_id == activeJob?.pipeline_id) {
                                dispatch(resultActions.setOpenPanel([1, 2]));
                                return;
                            }
                            dispatch(loadResult({
                                accessToken,
                                job: params.row,
                            })).then(async (value: any) => {
                                try {
                                    //@ts-ignore
                                    let volumes = value.payload.volumes;
                                    let niis = value.payload.niis;
                                    for (let i = 0; i < niis.length; i++) {
                                        let nii = niis[i];
                                        if (nii.id === 0) {
                                            dispatch(resultActions.selectVolume(i));
                                            nv.loadVolumes([volumes[i]]);
                                            dispatch(resultActions.setOpenPanel([1, 2]));
                                            nv.closeDrawing();
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    warn("Error loading results, please check internet connectivity");
                                }
                                setTimeout(() => nv.resizeListener(), 700);
                                //@ts-ignore
                                dispatch(getPipelineROI({
                                    pipeline: params.row.pipeline_id,
                                    accessToken: accessToken
                                }));
                            });
                        }}>
                            {resultLoading == params.row.id || params.row.status == 'pending' ?
                                <div className="spinner-border spinner-border-sm" style={{aspectRatio: '1 / 1'}}
                                     role="status"/>
                                :
                                <PlayArrowIcon sx={{
                                    color: (params.row.status != 'completed') ? '#a9b7a9' : '#4CAF50', // green color
                                    '&:hover': {
                                        color: '#45a049', // darker green when hovering
                                    },
                                }}/>
                            }
                        </IconButton>
                        <IconButton onClick={(e) => {
                            e.stopPropagation();
                            params.row.files.forEach(file => {
                                let url = file.link;
                                if (url == "unknown")
                                    return;
                                // Create an anchor element
                                const a = document.createElement('a');
                                // Extract the file name from the URL, if possible
                                a.download = `${file.fileName}.${url.split('.').pop()}`;
                                a.href = url;
                                // Append the anchor to the body (this is necessary to programmatically trigger the click event)
                                document.body.appendChild(a);

                                // Trigger a click event to start the download
                                a.click();

                                // Remove the anchor from the body
                                document.body.removeChild(a);
                            });

                        }}>
                            <GetAppIcon/>
                        </IconButton>
                        <IconButton onClick={(event) => {
                            event.stopPropagation();
                            if (params.row.pipeline_id == activeJob?.pipeline_id) {
                                setShowingLogs(!showingLogs);
                                return;
                            }
                            dispatch(loadResult({
                                accessToken,
                                job: params.row,
                            })).then((value: any) => {
                                setShowingLogs(true);
                                try {
                                    //@ts-ignore
                                    let volumes = value.payload.volumes;
                                    let niis = value.payload.niis;
                                    for (let i = 0; i < niis.length; i++) {
                                        let nii = niis[i];
                                        if (nii.name === 'SNR') {
                                            dispatch(resultActions.selectVolume(i));
                                            nv.loadVolumes([volumes[i]]);
                                            nv.closeDrawing();
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    console.log(e);
                                    setWarning("Error loading logs, please wait till the task is complete");
                                    setWarningOpen(true);
                                    setTimeout(() => {
                                        setWarningOpen(false);
                                        setWarning("");
                                    }, 5000)
                                }
                            });
                        }}>
                            <TerminalOutlinedIcon/>
                        </IconButton>
                    </div>
                );
            },
        }
    ];
    const UploadHeaders: AxiosRequestConfig = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Api-Key': queueToken
        },
    };

    const [uploaderKey, setUploaderKey] = useState(0);
    const [nameDialogOpen, setNameDialogOpen] = useState(false);
    const [originalName, setOriginalName] = useState('');
    const [renamingCallback, setRenamingCallback] =
        useState(()=>(async (val:string)=>true));
    const [cancelCallback, setCancelCallback] =
        useState(()=>(async (val:string)=>true));

    return (
        <Fragment>
            <Snackbar anchorOrigin={{vertical: 'top', horizontal: 'left'}}
                      TransitionComponent={(props) => <Slide {...props} direction="right"/>}
                      open={warningOpen} autoHideDuration={7000} onClose={() => setWarningOpen(false)}>
                <Alert onClose={() => setWarningOpen(false)} severity="error" sx={{width: '100%'}}>
                    {warning}
                </Alert>
            </Snackbar>
            <EditConfirmation  open={nameDialogOpen} setOpen = {setNameDialogOpen}
                               cancelCallback={cancelCallback}
                               cancellable={true}
                               defaultText={originalName}
                               message={'Change the alias associated with the result file.'}
                               name={'Job alias'}
                               confirmCallback={renamingCallback}/>
            <CmrCollapse accordion={false} expandIconPosition="right" activeKey={openPanel}
                         onChange={(key: any) => {
                if(openPanel.indexOf(0)<0&&key.indexOf(0)>=0) {
                    dispatch(getUpstreamJobs(accessToken));
                }
                dispatch(resultActions.setOpenPanel(key));
            }}>
                <CmrPanel header='Results' className={'mb-2'} key={'0'}>
                    <Row style={{alignItems:'center'}}>
                        <CmrUpload style={{marginLeft: 'auto',marginTop:'auto',marginBottom:'auto'}}
                                   uploadButtonName={'Upload Result'}
                                   maxCount={1}
                                   key={uploaderKey}
                                   preprocess={async (file)=>{
                                       try {
                                           let alias = await getAlias(file.name);
                                           return processJobZip(file,alias,accessToken);
                                       }catch {
                                           return 400;
                                       }
                                   }}
                                   uploadFailed={()=>{
                                        warn('There was a problem with the result file provided.');
                                        setUploaderKey(uploaderKey+1);
                                    }}
                                   onUploaded={()=>{//Refresh job list after successful upload
                                        dispatch(getUpstreamJobs(accessToken));
                                        console.log(uploaderKey);
                                        setUploaderKey(uploaderKey+1);
                                   }}
                                   uploadHandler={uploadHandlerFactory(accessToken, queueToken, dispatch, uploadJob)}
                        >Upload Job Zip </CmrUpload>
                        <CmrCheckbox defaultChecked={true} onChange={(e) => {
                            //@ts-ignore
                            setAutoRefresh(e.target.value);
                        }}>Auto Refreshing</CmrCheckbox>
                    </Row>
                    <CmrTable dataSource={results} columns={completedJobsColumns}/>
                    <Button className={'mt-3'} fullWidth variant={'contained'} onClick={() => {
                        dispatch(getUpstreamJobs(accessToken));
                    }}>Refresh {jobsLoading&& <CircularProgress size={18} style={{color:'white',position:'relative', left:'5pt'}}/>}</Button>
                    {showingLogs && <Logs/>}
                </CmrPanel>
                <CmrPanel className={'mb-2'}
                          header={activeJobAlias != undefined ? `Inspecting ${activeJobAlias}` : 'Inspection'}
                          key={'1'}>
                    {activeJob != undefined &&
                        <NiiVue niis={niis}
                                warn={warn}
                                setWarning={setWarning}
                                setWarningOpen={setWarningOpen}
                                setSelectedVolume={(index: number) => {
                                    dispatch(resultActions.selectVolume(index));
                                }} selectedVolume={selectedVolume} key={pipelineID} rois={rois} pipelineID={pipelineID}
                                saveROICallback={() => {
                                    if(pipelineID)
                                        dispatch(getPipelineROI({
                                            pipeline: pipelineID,
                                            accessToken: accessToken
                                        }));
                                }}
                                accessToken={accessToken}/>}
                    {activeJob == undefined &&
                        <Box sx={{display: 'flex', justifyContent: 'center', color: 'rgba(0,0,0,0.4)'}}>
                            No Result Inspections Running
                        </Box>}
                </CmrPanel>
                <CmrPanel header={'Settings Inspection'} key={'2'}>

                    {activeJob == undefined ?
                        <Box sx={{display: 'flex', justifyContent: 'center', color: 'rgba(0,0,0,0.4)'}}>
                            No Setup Inspections Running
                        </Box> :
                        <SetupInspection/>
                    }
                </CmrPanel>
            </CmrCollapse>
            <div style={{height: '69px'}}></div>
        </Fragment>
    );
};

export default Results;
