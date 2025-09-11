import React, { Fragment, useEffect, useState } from 'react';
import './Results.scss';
import { CmrTable, CmrCollapse, CmrPanel } from 'cloudmr-ux';
import { getUploadedData } from 'cloudmr-core';
import { useAppDispatch, useAppSelector } from '../../features/hooks';
import IconButton from "@mui/material/IconButton";
import GetAppIcon from "@mui/icons-material/GetApp";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NiiVue, { nv } from "../../common/components/src/Niivue";
import { Job, uploadData, getUpstreamJobs } from "cloudmr-core";
import { resultActions, ROI } from "../../features/rois/resultSlice";
import { getPipelineROI, loadResult } from "../../features/rois/resultActionCreation";
import { Alert, Button, CircularProgress, Slide, Snackbar } from "@mui/material";
import { CmrCheckbox } from 'cloudmr-ux';
import { Row } from "antd";
import Box from "@mui/material/Box";
import { SetupInspection } from "./SetupInspection";
import { Logs } from "./Logs";
import { CMRUpload } from 'cloudmr-ux';
import { AxiosRequestConfig } from "axios";
import { processJobZip } from "./PreprocessJob";
import { deleteUpstreamJob, uploadHandlerFactory } from "cloudmr-core";
import { CmrEditConfirmation } from 'cloudmr-ux';
import DeleteIcon from "@mui/icons-material/Delete";
import Tooltip from '@mui/material/Tooltip';

import { CmrConfirmation } from 'cloudmr-ux';


export interface NiiFile {
    filename: string;
    id: number;
    dim: number;
    name: string;
    type: string;
    link: string;
}

const Results = ({ visible }: { visible?: boolean }) => {
    const dispatch = useAppDispatch();
    const { accessToken, queueToken } = useAppSelector((state) => state.authenticate);
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

    const [name, setName] = useState<string | undefined>(undefined);
    const [message, setMessage] = useState<string | undefined>(undefined);
    const [color, setColor] = useState<"inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning" | undefined>(undefined);
    const [open, setOpen] = useState<boolean>(false);
    const [confirmCallbackjob, setConfirmCallbackjob] = useState<() => void>(() => { });
    const [cancelCallbackjob, setCancelCallbackjob] = useState<() => void>(() => { });

    useEffect(() => {
        //@ts-ignore
        dispatch(getUploadedData());
        //@ts-ignore
        dispatch(getUpstreamJobs());

        let interval = setInterval(() => {
            if (visible && autoRefresh && openPanel.indexOf(0) >= 0) {
                //@ts-ignore
                dispatch(getUpstreamJobs());
            }
        }, 15000);
        return () => {
            clearInterval(interval);
        }
    }, [visible]);

    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const warn = (message: string) => {

        setWarning(message);
        setWarningOpen(true);
        setTimeout(() => {
            setWarningOpen(false);
            setWarning("");
        }, 5000)
    }

    const getAlias = async (alias: string) => {
        setOriginalName(alias);
        setNameDialogOpen(true);
        return new Promise<string>((resolve, reject) => {
            const callback = async (value: string) => {
                resolve(value);
                return true;
            }
            const cancelCallback = async (_: string) => {
                reject(alias);
                return true;
            }
            setRenamingCallback(() => callback);
            setCancelCallback(() => cancelCallback);
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
            flex: 2,
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
            headerName: 'Actions',
            sortable: false,
            width: 256,
            disableClickEventBubbling: true,
            renderCell: (params: { row: Job }) => {
                return (
                    <div>
                        {params.row.status != 'failed' && (
                            <Tooltip title={`View job ${params.row.alias}`}>

                                <IconButton disabled={params.row.status == 'pending'} onClick={(event) => {
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
                                            // console.log(value);
                                            // @ts-ignore
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
                                        <div className="spinner-border spinner-border-sm" style={{ aspectRatio: '1 / 1' }}
                                            role="status" />
                                        :
                                        <PlayArrowIcon sx={{
                                            color: (params.row.status != 'completed') ? '#8a6fae' : '#580f8b', // purple color
                                            '&:hover': {
                                                color: '#390063', // darker purple when hovering
                                            },
                                        }} />
                                    }
                                </IconButton>
                            </Tooltip>
                        )}
                        {params.row.status === 'completed' && (
                            <Tooltip title={`Download job ${params.row.alias}`}>
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
                                    <GetAppIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        <Tooltip title={`Delete job ${params.row.alias}`}>
                            <IconButton onClick={() => {
                                setName(`Deleting job`);
                                setMessage(`Please confirm that you are deleting job ${params.row.id.toString()}.`);
                                setColor('error');
                                setConfirmCallbackjob(() => async () => {
                                    try {
                                        // First, delete the upstream job
                                        await dispatch(deleteUpstreamJob({ jobId: params.row.id.toString() }));

                                        // Then, fetch the updated upstream jobs
                                        await dispatch(getUpstreamJobs());

                                        // console.log("Job deleted and upstream jobs updated successfully.");
                                    } catch (error) {
                                        console.error("Error deleting job or fetching updated jobs:", error);
                                    }
                                });
                                setCancelCallbackjob(() => {
                                    // console.log("Cancel action was triggered.");

                                });
                                setOpen(true);
                            }}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                        <CmrConfirmation
                            name={name}
                            message={message}
                            color={color}
                            open={open}
                            setOpen={setOpen}
                            confirmCallback={() => confirmCallbackjob()} // Wrap in a function
                            cancelCallback={() => {
                                if (cancelCallbackjob) {
                                    cancelCallbackjob();
                                } else {
                                    setOpen(false); // Close the dialog if no cancel callback is set
                                }
                            }} cancellable={true}
                            width={450}
                        />

                        {/* {((params.row.status === 'completed') || (params.row.status === 'failed'))  && ( */}
                        {/* {(params.row.status === 'completed')  && (
                            <Tooltip title={`Read Log of job ${params.row.alias}`}>

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

                            <HistoryOutlined/>
                        </IconButton>
                        </Tooltip>
                        )} */}
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
        useState(() => (async (val: string) => true));
    const [cancelCallback, setCancelCallback] =
        useState(() => (async (val: string) => true));

    return (
        <Fragment>
            <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                TransitionComponent={(props) => <Slide {...props} direction="right" />}
                open={warningOpen} autoHideDuration={7000} onClose={() => setWarningOpen(false)}>
                <Alert onClose={() => setWarningOpen(false)} severity="error" sx={{ width: '100%' }}>
                    {warning}
                </Alert>
            </Snackbar>
            <CmrEditConfirmation open={nameDialogOpen} setOpen={setNameDialogOpen}
                cancelCallback={cancelCallback}
                cancellable={true}
                defaultText={originalName}
                message={'Provide the alias associated with the result file.'}
                name={'Job Alias'}
                confirmCallback={renamingCallback} />
            <CmrCollapse accordion={false} expandIconPosition="right" activeKey={openPanel}
                onChange={(key: any) => {
                    if (openPanel.indexOf(0) < 0 && key.indexOf(0) >= 0) {
                        dispatch(getUpstreamJobs());
                    }
                    dispatch(resultActions.setOpenPanel(key));
                }}>
                <CmrPanel header='Job Results' className={'mb-2'} key={'0'}>
                    <Row style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <CMRUpload style={{ marginTop: 'auto', marginBottom: 'auto' }}
                            uploadButtonName={'Upload Results'}
                            maxCount={1}
                            key={uploaderKey}
                            fileExtension={'.zip'}
                            preprocess={async (file) => {
                                try {
                                    let alias = await getAlias(file.name);
                                    return processJobZip(file, alias, accessToken);
                                } catch {
                                    return 400;
                                }
                            }}
                            uploadFailed={() => {
                                warn('There was a problem with the result file provided.');
                                setUploaderKey(uploaderKey + 1);
                            }}
                            onUploaded={() => {//Refresh job list after successful upload
                                dispatch(getUpstreamJobs());
                                // console.log(uploaderKey);
                                setUploaderKey(uploaderKey + 1);
                            }}
                            uploadHandler={uploadHandlerFactory(accessToken, queueToken, dispatch, uploadData)}
                        >Upload Results</CMRUpload>
                        <CmrCheckbox defaultChecked={true} onChange={(e) => {
                            //@ts-ignore
                            setAutoRefresh(e.target.value);
                        }}>Auto Refreshing</CmrCheckbox>
                    </Row>
                    <CmrTable dataSource={results} columns={completedJobsColumns} showCheckbox={false} // This will hide the checkboxes
                    />
                    <Button className={'mt-3'} fullWidth variant={'contained'} onClick={() => {
                        dispatch(getUpstreamJobs());
                    }}>Refresh {jobsLoading && <CircularProgress size={18} style={{ color: 'white', position: 'relative', left: '5pt' }} />}</Button>
                    {showingLogs && <Logs />}
                </CmrPanel>
                <CmrPanel className={'mb-2'}
                    header={activeJobAlias != undefined ? `Viewing ${activeJobAlias}` : 'View Results'}
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
                                if (pipelineID)
                                    dispatch(getPipelineROI({
                                        pipeline: pipelineID,
                                        accessToken: accessToken
                                    }));
                            }}
                            accessToken={accessToken} />}
                    {activeJob == undefined &&
                        <Box sx={{ display: 'flex', justifyContent: 'center', color: 'rgba(0,0,0,0.4)' }}>
                            Please Select a Job Result
                        </Box>}
                </CmrPanel>
                <CmrPanel header={'Current Job Settings'} key={'2'}>
                    {activeJob?.status === 'completed' ? (
                        <SetupInspection />
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', color: 'rgba(0,0,0,0.4)' }}>
                            {!activeJob ? 'Please Select a Job Result' : 'Job is not completed'}
                        </Box>
                    )}
                </CmrPanel>
            </CmrCollapse>
            <div style={{ height: '69px' }}></div>
        </Fragment>
    );
};

export default Results;
