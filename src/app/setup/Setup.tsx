import React, {Fragment, useEffect, useState} from 'react';
import './Setup.scss';
import CmrCollapse from '../../common/components/Cmr-components/collapse/Collapse';
import CmrPanel from '../../common/components/Cmr-components/panel/Panel';
import {getUploadedData} from '../../features/data/dataActionCreation';
import {DATAAPI, DATAUPLODAAPI} from "../../Variables";
import {useAppDispatch, useAppSelector} from '../../features/hooks';
import {setupGetters, setupSetters} from '../../features/setup/setupSlice';
import SelectUpload from "../../common/components/Cmr-components/select-upload/SelectUpload";
import CmrLabel from "../../common/components/Cmr-components/label/Label";
import {Col, Row} from "antd";
import AddIcon from '@mui/icons-material/Add';
import {anonymizeTWIX} from '../../common/utilities/file-transformation/anonymize';
import moment from 'moment';

import {
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    RadioGroup,
    Radio,
    InputLabel,
    Select, MenuItem, Tooltip, Snackbar, Alert, Slide
} from "@mui/material";
import CmrCheckbox from "../../common/components/Cmr-components/checkbox/Checkbox";
import {
    DataGrid,
    GridCellEditStopParams,
    GridCellEditStopReasons,
    GridColDef, GridEditInputCell, GridRowId,
    GridRowSelectionModel,
    GridRowsProp,
    MuiEvent
} from "@mui/x-data-grid";
import CmrButton from "../../common/components/Cmr-components/button/Button";
import CmrTable from "../../common/components/CmrTable/CmrTable";
import CmrInputNumber from "../../common/components/Cmr-components/input-number/InputNumber";
import {AxiosRequestConfig, AxiosResponse} from "axios";
import {UploadedFile} from "../../features/data/dataSlice";
import {formatBytes, getFileExtension} from "../../common/utilities";
import {boolean} from "mathjs";
import {Job, jobActions, SetupInterface} from "../../features/jobs/jobsSlice";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import {useStore} from "react-redux";
import {SNRPreview} from "./SetupPreviewer";
import {store} from "../../features/store";
import {submitJobs} from "../../features/setup/setupActionCreation";
import {snrDescriptions} from "./SetupDescriptions";
import Confirmation from '../../common/components/Cmr-components/dialogue/Confirmation';
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import UploadWindow from '../../common/components/Cmr-components/upload/UploadWindow';
import downloadStringAsFile from "../../common/utilities/DownloadFromText";
import {SNREditor} from './SetupEditor';
import {LambdaFile} from "../../common/components/Cmr-components/upload/Upload";
import {createTheme} from "@mui/material/styles";


const Setup = () => {
    useEffect(() => {
        //@ts-ignore
        MathJax.typeset();
    }, []);

    const dispatch = useAppDispatch();
    const {accessToken} = useAppSelector((state) => state.authenticate);
    const editActive = useAppSelector(state => state.setup.editInProgress);
    const queuedJobs = useAppSelector((state) => state.setup.queuedJobs);
    const newJobId = useAppSelector((state) => state.setup.idGenerator);
    const signal = useAppSelector(setupGetters.getSignal);
    console.log(signal);
    const noise = useAppSelector(setupGetters.getNoise);
    const multiraid = useAppSelector(setupGetters.getMultiRaid);
    console.log(multiraid);
    const uploadedData = useAppSelector((state) => state.data.files);
    const setSignal = setupSetters.setSignal;
    const setNoise = setupSetters.setNoise;
    const [breakpoint, setBreakpoint] = useState('');
    const analysisMethod = useAppSelector(setupGetters.getAnalysisMethod);
    console.log(analysisMethod);
    const [analysisMethodChanged, setAnalysisMethodChanged] = useState(false);
    const analysisMethodName = useAppSelector(setupGetters.getAnalysisMethodName);
    const reconstructionMethod = useAppSelector(setupGetters.getReconstructionMethod);
    const [reconstructionMethodChanged, setReconstructionMethodChanged] = useState(false);
    const pseudoReplicaCount = useAppSelector(setupGetters.getPseudoReplicaCount);
    const flipAngleCorrection = useAppSelector(setupGetters.getFlipAngleCorrection);
    const faMap = useAppSelector(setupGetters.getFlipAngleCorrectionFile);
    const loadSensitivity = useAppSelector(setupGetters.getLoadSensitivity);
    const sensitivityMapMethod = useAppSelector(setupGetters.getSensitivityMapMethod);
    const sensitivityMapSource = useAppSelector(setupGetters.getSensitivityMapSource);
    const decimateData = useAppSelector(setupGetters.getDecimate);
    const decimateAcceleration1 = useAppSelector(setupGetters.getDecimateAcceleration1);
    const decimateAcceleration2 = useAppSelector(setupGetters.getDecimateAcceleration2);
    const decimateACL = useAppSelector(setupGetters.getDecimateACL);
    const kernelSize1 = useAppSelector(setupGetters.getKernelSize1);
    const kernelSize2 = useAppSelector(setupGetters.getKernelSize2);
    let snrDescription = analysisMethodName ? snrDescriptions[analysisMethodName] : '';
    if (analysisMethodChanged) {
        setTimeout(() => {
            window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
            //@ts-ignore
            MathJax.typesetPromise();
        }, 10);
        setAnalysisMethodChanged(false);
    }

    if (reconstructionMethodChanged) {
        setTimeout(() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}), 10);
        setReconstructionMethodChanged(false);
    }

    // Option availability maps
    const topToSecondaryMaps = [[0, 1, 2], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]];
    const secondaryToCoilMethodMaps = [[], ['inner'], ['inner', 'innerACL'], []];
    const idToSecondaryOptions = ['Root sum of squares', 'B-1 Weighted', 'Sense', 'Grappa'];
    const coilOptionAlias: { [options: string]: string } = {
        'inner': 'Internal Reference',
        'innerACL': 'Internal Reference with AutoCalibration Lines'
    };
    const decimateMapping = [false, false, true, true];

    const uploadResHandlerFactory = (reducer:
                                         (payload: UploadedFile) => {
                                             payload: UploadedFile,
                                             type: string
                                         }, additionalCallbacks?: () => void) => {
        return (res: AxiosResponse, maskFile: File) => {
            const submittedDatTime = moment().format('YYYY-MM-DD HH:mm:ss');
            const uploadedFile: UploadedFile = {
                id: res.data.response.id,
                fileName: res.data.response.filename,
                createdAt: submittedDatTime,
                updatedAt: submittedDatTime,
                size: formatBytes(maskFile.size),
                link: res.data.response.onlineLink,
                status: res.data.response.status,
                md5: res.data.response.md5,
                database: 's3',
                location: res.data.response.location
            };
            dispatch(reducer(uploadedFile));
            // @ts-ignore
            dispatch(getUploadedData(accessToken));
            (additionalCallbacks) &&
            additionalCallbacks();
        };
    };

    const UploadHeaders: AxiosRequestConfig = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
    };
    const createPayload = async (file: File, fileAlias: string) => {
        let formData = new FormData();
        if (file) {
            const lambdaFile: LambdaFile = {
                "filename": fileAlias,
                "filetype": file.type,
                "filesize": `${file.size}`,
                "filemd5": '',
                "file": file
            }
            formData.append("lambdaFile", JSON.stringify(lambdaFile));
            formData.append("file", file);
            const fileExtension = getFileExtension(file.name);

            if (fileExtension == 'dat') {
                const transformedFile = await anonymizeTWIX(file);
                file = transformedFile;
            }
            return {destination: DATAUPLODAAPI, lambdaFile: lambdaFile, file: file, config: UploadHeaders};
        }
    };
    useEffect(() => {
        //@ts-ignore
        dispatch(getUploadedData(accessToken));

        const updateBreakpoint = () => {
            if (window.innerWidth < 992) setBreakpoint('md');
            else if (window.innerWidth < 1200) setBreakpoint('lg');
            else if (window.innerWidth < 1400) setBreakpoint('xl');
            else setBreakpoint('xxl');
        };

        window.addEventListener('resize', updateBreakpoint);
        updateBreakpoint();
    }, []);

    const columns: GridColDef[] = [
        {field: 'type', headerName: 'type', width: 180, editable: false},
        {
            field: 'value',
            headerName: 'value',
            type: 'number',
            editable: false,
            align: 'left',
            headerAlign: 'left',
            width: 180,
            renderCell: (params)=>{
                console.log(params);
                switch(params.id){
                    case 1:
                        return <CmrInputNumber value={decimateAcceleration1}
                                               min={1}
                                               max={1}
                                               style={{width:'100%'}}
                                               onChange={(val) => {
                                                   dispatch(setupSetters.setDecimateAccelerations1((val == null) ? 0 : val))
                                               }}></CmrInputNumber>;
                    case 2:
                        return <CmrInputNumber value={decimateAcceleration2}
                                        min={0}
                                        style={{width:'100%'}}
                                        onChange={(val) => {
                                            dispatch(setupSetters.setDecimateAccelerations2((val == null) ? 0 : val))
                                        }}></CmrInputNumber>;
                    case 3:
                        return <CmrInputNumber value={decimateACL}
                                               style={{width:'100%'}}
                                               min={0}
                                               onChange={(val) => {
                                                   dispatch(setupSetters.setDecimateACL((val == null) ? 0 : val))
                                               }}></CmrInputNumber>;
                }
            }
        }];
    const rows: GridRowsProp = [
        // {
        //     id: 1,
        //     type: 'Acceleration factor 1',
        // },
        {
            id: 2,
            type: 'Acceleration factor',
        },
        {
            id: 3,
            type: 'Autocalibration Lines',
        }];
    const kernelSizeColumns: GridColDef[] = [
        {field: 'type', headerName: 'type', width: 180, editable: false},
        {
            field: 'value',
            headerName: 'value',
            type: 'number',
            editable: false,
            align: 'left',
            headerAlign: 'left',
            width: 180,
            renderCell: (params)=>{
                console.log(params);
                switch(params.id){
                    case 1:
                        return <CmrInputNumber value={kernelSize1}
                                               min={1}
                                               style={{width:'100%'}}
                                               onChange={(val) => {
                                                   dispatch(setupSetters.setKernelSize1((val == null) ? 0 : val))
                                               }}></CmrInputNumber>;
                    case 2:
                        return <CmrInputNumber value={kernelSize2}
                                               min={1}
                                               style={{width:'100%'}}
                                               onChange={(val) => {
                                                   dispatch(setupSetters.setKernelSize2((val == null) ? 0 : val))
                                               }}></CmrInputNumber>;
                }
            }
        }];
    const kernelSizeRows: GridRowsProp = [
        {
            id: 1,
            type: 'Kernel size 1',
        },
        {
            id: 2,
            type: 'Kernel size 2',
        }];
    const queuedJobsColumns:GridColDef[] = [
        {
            headerName: 'Job ID',
            field: 'id',
            flex: 1,
        },
        {
            headerName: 'Alias',
            field: 'alias',
            flex: 3,
        },
        {
            headerName: 'Date Created',
            field: 'createdAt',
            flex: 2,
        },
        {
            headerName: 'Status',
            field: 'status',
            flex: 1,
        },
        {
            field: 'options',
            headerName: 'Options',
            sortable: false,
            width: 160,
            disableColumnMenu: true,
            minWidth: 160,
            renderHeader: () => {
                return (
                    <React.Fragment>
                        <div style={{cursor: 'pointer'}} onClick={() => {
                            setSchemaSelector(true);
                        }}> Actions
                        </div>
                        <Tooltip title="Upload schema directly">
                            <IconButton style={{marginLeft:'auto'}} onClick={() => {
                                setSchemaSelector(true);
                            }}>
                                <AddIcon fontSize={'medium'} sx={{}}/>
                            </IconButton>
                        </Tooltip>
                    </React.Fragment>
                );
            },
            renderCell: (params: any) => {
                return (
                    <div>
                        <IconButton onClick={(e) => {/* Edit logic here */
                            e.stopPropagation();
                            let snrPreview: SetupInterface = params.row.setup;
                            setRowId(params.row.id);
                            setEditContent(JSON.stringify(snrPreview, null, '\t'));
                            setEditedJSON(snrPreview.task);
                            setEditAlias(params.row.alias);
                        }}>
                            <EditIcon/>
                        </IconButton>
                        <IconButton onClick={(e) => {/* Download logic here */
                            e.stopPropagation();
                            let row = params.row;
                            let setup = row.setup;
                            let alias = row.alias;
                            if (alias.split('.').pop() != 'json') {
                                alias = `${alias}.json`;
                            }
                            downloadStringAsFile(JSON.stringify(row, undefined, '\t'), alias);
                        }}>
                            <GetAppIcon/>
                        </IconButton>
                        <IconButton onClick={(e) => {/* Delete logic here */
                            e.stopPropagation();
                            setSNRDeleteWarning(`You are about to delete ${params.row.alias}.`);
                            setSNRDeleteOpen(true);
                            setSNRDeleteWarningCallback(() => {
                                return () => dispatch(setupSetters.deleteQueuedJob(params.id));
                            });
                        }}>
                            <DeleteIcon/>
                        </IconButton>
                    </div>
                );
            },
        },
    ];

    const [openPanel, setOpenPanel] = useState((noise != undefined && signal != undefined) ? [2] : [1]);
    let snr: any = undefined;
    let [previewContent, setPreview] = useState<string | undefined>(undefined);
    const [schemaSelector, setSchemaSelector] = useState(false);
    const [sdWarning, setSDWarning] = useState<string | undefined>();
    const [sdWarningHeader, setSDWarningHeader] = useState<string>("No Job Selected for Deletion");
    const [sdOpen, setSDOpen] = useState(false);

    const [snrEditWarning, setSNREditWarning] = useState<string | undefined>();
    const [snrEditWarningCallback, setSnrEditWarningCallback] = useState<() => void>(() => {
    });
    const [snrEditOpen, setSNREditOpen] = useState(false);

    const [snrDeleteWarning, setSNRDeleteWarning] = useState<string | undefined>();
    const [snrDeleteWarningCallback, setSNRDeleteWarningCallback] = useState<() => void>(() => {
    });
    const [snrDeleteOpen, setSNRDeleteOpen] = useState(false);

    const [jobSelectionModel, setJobSelectionModel] = useState<GridRowId[]>([]);

    const [editedJSON, setEditedJSON] = useState<any>();
    const [editContent, setEditContent] = useState<string | undefined>(undefined);
    const [editAlias, setEditAlias] = useState<string>('');
    const [rowId, setRowId] = useState<number>(-1);
    const [editing, setEditing] = useState<number>(-1);

    const [jobAlias, setJobAlias] = useState<string>('');

    const [snackOpen, setSnackOpen] = useState(false)
    const handleSnackClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setSnackOpen(false);
        setTimeout(()=>dispatch(jobActions.resetSubmissionState()),1000);
    };
    const snackAlert = useAppSelector(state=>{return state.jobs.submittingText;});
    // @ts-ignore
    // @ts-ignore
    return (
        <Fragment>
            <CmrCollapse accordion={false} expandIconPosition="right"
                         activeKey={openPanel} onChange={(key: any) => {
                console.log(key);
                setOpenPanel(key)
            }}>
                <CmrPanel header='Job Queue' className={'mb-2'} key={'0'}>
                    <UploadWindow open={schemaSelector} setOpen={setSchemaSelector} fileExtension={'.json'}
                                  upload={async (file, fileAlias) => {
                                      let snr = JSON.parse(await file.text());
                                      let name = fileAlias;
                                      setJobSelectionModel([newJobId, ...jobSelectionModel]);
                                      dispatch(setupSetters.queueSNRJob({snr, name}));
                                      return 200;
                                  }} template={{showFileSize: true, showDatabase: false, showFileName: true}}/>
                    <CmrTable dataSource={queuedJobs} columns={queuedJobsColumns}
                              rowSelectionModel={jobSelectionModel}
                              onRowSelectionModelChange={(newSelection: GridRowSelectionModel) => {
                                  setJobSelectionModel(newSelection);
                              }}/>
                    <SNREditor snrContent={editContent}
                               snrAlias={editAlias}
                               setSNRAlias={setEditAlias}
                               edit={() => {
                                   if (editing == rowId)
                                       return;
                                   if (editActive && analysisMethod != undefined) {
                                       setSNREditWarning('Consider queuing the currently ' +
                                           'edited SNR first to avoid losing progress.');
                                       setSNREditOpen(true);
                                       setSnrEditWarningCallback(() => {
                                           // dispatch(setupSetters.loadSNRSettings(editedJSON));
                                           setOpenPanel([0, 1, 2]);
                                           setAnalysisMethodChanged(true);
                                       });
                                   } else {
                                       dispatch(setupSetters.loadSNRSettings(editedJSON));
                                       setAnalysisMethodChanged(true);
                                       setEditing(rowId);
                                       setOpenPanel([0, 1, 2]);
                                   }
                               }} confirm={() => {
                        if (editing == rowId)// when confirming both the snr edit and the name change
                            dispatch(setupSetters.completeSNREditing({id: editing, alias: editAlias}));
                        else {// when confirming the name change alone
                            dispatch(setupSetters.rename({id: rowId, alias: editAlias}));
                        }
                        setEditing(-1);
                        setTimeout(() => setOpenPanel([0]), 500);
                    }}
                               handleClose={() => {
                                   setEditContent(undefined);
                               }}/>
                    <Snackbar anchorOrigin={ {vertical: 'top', horizontal: 'left'}}
                              TransitionComponent={(props)=><Slide {...props} direction="right" />}
                              open={snackOpen} autoHideDuration={7000} onClose={handleSnackClose}>
                        <Alert onClose={handleSnackClose} severity="success" sx={{ width: '100%' }}>
                            {snackAlert}
                        </Alert>
                    </Snackbar>
                    <Confirmation setOpen={setSNRDeleteOpen}
                                  open={snrDeleteOpen}
                                  message={snrDeleteWarning}
                                  color={'error'} name={"Confirm Delete"}
                                  cancellable={true}
                                  confirmCallback={snrDeleteWarningCallback}/>
                    <Confirmation setOpen={setSNREditOpen}
                                  open={snrEditOpen}
                                  message={snrEditWarning}
                                  name={"Unfinished SNR Edit"}
                                  cancellable={true}
                                  confirmCallback={snrEditWarningCallback}/>
                    <CmrButton sx={{width: '50%', mt: 1}} variant={"contained"}
                               color={'success'} onClick={() => {
                        if (jobSelectionModel.length == 0) {
                            setSDWarning("Please select the jobs that you would like to submit.");
                            setSDWarningHeader("No Job Selected for Submission");
                            setSDOpen(true);
                        } else {
                            let selectedJobs = jobSelectionModel.map((value, index) => {
                                for (let job of queuedJobs) {
                                    if (job.id == value) {
                                        return job;
                                    }
                                }
                            });
                            dispatch(jobActions.resetSubmissionState());
                            // @ts-ignore
                            dispatch(submitJobs({accessToken, jobQueue: selectedJobs}));
                            setSnackOpen(true);
                        }
                    }}>Submit Jobs</CmrButton>

                    <CmrButton sx={{width: '49%', marginLeft: '1%', mt: 1}} variant={"contained"}
                               color={'error'} onClick={() => {
                        if (jobSelectionModel.length == 0) {
                            setSDWarning("Please select the jobs that you would like to delete.");
                            setSDWarningHeader("No Job Selected for Deletion");
                            setSDOpen(true);
                        } else {
                            setSNRDeleteWarning(`You are about to delete Job ${jobSelectionModel}.`);
                            setSNRDeleteOpen(true);
                            setSNRDeleteWarningCallback(() => {
                                // @ts-ignore
                                return () => dispatch(setupSetters.bulkDeleteQueuedJobs(jobSelectionModel));
                            });
                        }
                    }}>Delete Jobs</CmrButton>
                    <Confirmation open={sdOpen} setOpen={setSDOpen}
                                  message={sdWarning}
                                  name={sdWarningHeader}/>
                </CmrPanel>
                <CmrPanel key="1" header="Signal & Noise Files" className='mb-2'>
                    <Row>
                        <Col span={24}>
                            <Row style={{fontFamily: 'Roboto, Helvetica, Arial, sans-serif'}}>
                                <CmrLabel>Signal File:</CmrLabel>
                                <SelectUpload fileSelection={uploadedData} onSelected={(signal) => {
                                    dispatch(setSignal(signal));
                                    console.log('setting signal:');
                                    console.log(signal);
                                    if (noise != undefined && signal != undefined)
                                        setTimeout(() => setOpenPanel([2]), 500);
                                }} maxCount={1}
                                              createPayload={createPayload}
                                              onUploaded={uploadResHandlerFactory(setSignal, () => {
                                                  if (noise != undefined && signal != undefined)
                                                      setTimeout(() => setOpenPanel([2]), 500);
                                              })} style={{
                                    height: 'fit-content',
                                    marginTop: 'auto',
                                    marginBottom: 'auto',
                                    // background:'#580F8B'
                                }}
                                              chosenFile={(signal?.options.filename != '') ? signal?.options.filename : undefined}/>
                                <CmrCheckbox onChange={(event) => {
                                    dispatch(setupSetters.setMultiRaid(event.target.checked))
                                    if (signal != undefined && event.target.checked)
                                        setTimeout(() => setOpenPanel([2]), 500);
                                }} checked={multiraid != undefined && multiraid}>
                                    Multi-Raid
                                </CmrCheckbox>
                            </Row>
                        </Col>
                    </Row>
                    {(multiraid == undefined || !multiraid) &&
                        <Fragment>
                            <Divider variant="middle" sx={{marginTop: '15pt', marginBottom: '15pt', color: 'gray'}}/>
                            <Row>
                                <Col>
                                    <Row style={{fontFamily: 'Roboto, Helvetica, Arial, sans-serif'}}>
                                        <CmrLabel>Noise File:</CmrLabel>
                                        <SelectUpload fileSelection={uploadedData}
                                                      onSelected={(noise) => {
                                                          dispatch(setNoise(noise));
                                                          if (noise != undefined && signal != undefined)
                                                              setTimeout(() => setOpenPanel([2]), 500);
                                                      }} maxCount={1}
                                                      createPayload={createPayload}
                                                      onUploaded={uploadResHandlerFactory(setNoise, () => {
                                                          if (noise != undefined && signal != undefined)
                                                              setTimeout(() => setOpenPanel([2]), 500);
                                                      })}
                                                      style={{height: 'fit-content', marginLeft: '2pt'}}
                                                      chosenFile={(noise?.options.filename != '') ? noise?.options.filename : undefined}
                                        />
                                    </Row>
                                </Col>
                            </Row>
                        </Fragment>}
                </CmrPanel>
                <CmrPanel key="2" header={editing == -1 ? "SNR Setup" : `Editing Job ${editing}`} className='mb-2'>
                    <FormControl style={{width: '100%'}} className={'mb-3'} onChange={(event) => {
                        //@ts-ignore
                        if (event.target.value != analysisMethod)
                            setAnalysisMethodChanged(true);
                        //@ts-ignore
                        dispatch(setupSetters.setAnalysisMethod(event.target.value));
                    }}>
                        <FormLabel id={'snr-label'}>SNR Analysis Methods</FormLabel>
                        <RadioGroup
                            row
                            aria-labelledby="demo-row-radio-buttons-group-label"
                            name="row-radio-buttons-group"
                            value={analysisMethod}
                            style={{display: 'flex', justifyContent: 'space-between'}}
                        >
                            <FormControlLabel value={0} control={<Radio/>} label="Array Combining"/>
                            <FormControlLabel value={1} control={<Radio/>} label="Multiple Replica"/>
                            <FormControlLabel value={2} control={<Radio/>} label="Pseudo Multiple Replica"/>
                            <FormControlLabel value={3} control={<Radio/>} label="Pseudo Multiple Replica Wein"/>
                        </RadioGroup>
                    </FormControl>

                    {snrDescription != '' &&
                        <CmrPanel className='mb-3' header={undefined} cardProps={{className: 'mb-2 ms-2 me-2 mt-2'}}
                                  expanded={true}>
                            {snrDescription}
                        </CmrPanel>}

                    {(analysisMethod != undefined) &&
                        <CmrCollapse accordion={false} defaultActiveKey={[0]} expandIconPosition="right">
                            <CmrPanel header={'Reconstructor Options'} cardProps={{className: 'ms-3 me-3 mt-4 mb-3'}}
                                      className={''}>
                                {(analysisMethod == 2 || analysisMethod == 3) &&
                                    <Fragment>
                                        <Row className='mb-3' style={{fontFamily: 'Roboto, Helvetica, Arial, sans-serif'}}>
                                            {/*<FormControl style={{width: '100%'}} className={'mb-3'}>*/}
                                            {/*<FormLabel id={'replica-count-label'}>Image Reconstruction Methods</FormLabel>*/}
                                            {/*</FormControl>*/}
                                            <CmrLabel style={{height: '100%', marginTop:'auto',marginBottom:'auto',color: '#580F8B'}}>Number of Pseudo Replica:</CmrLabel>
                                            <CmrInputNumber value={pseudoReplicaCount}
                                                            min={20}
                                                            onChange={(val) => {
                                                                dispatch(setupSetters.setPseudoReplicaCount((val == null) ? 0 : val))
                                                            }}></CmrInputNumber>
                                        </Row>
                                        <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
                                    </Fragment>}
                                <FormControl style={{width: '100%'}} className={'mb-3'}
                                             onChange={(event) => {
                                                 //@ts-ignore
                                                 if (event.target.value != reconstructionMethod)
                                                     setReconstructionMethodChanged(true);
                                                 //@ts-ignore
                                                 dispatch(setupSetters.setReconstructionMethod(event.target.value));
                                             }}>
                                    <FormLabel id={'reconstruction-label'} className={'mb-3'}>Image Reconstruction Methods</FormLabel>
                                    <RadioGroup
                                        row
                                        aria-labelledby="demo-row-radio-buttons-group-label"
                                        name="row-radio-buttons-group"
                                        value={(reconstructionMethod != undefined) ? reconstructionMethod : ''}
                                        style={{display: 'flex', justifyContent: 'space-between'}}
                                    >
                                        {['Root sum of squares', 'B-1 Weighted', 'Sense', 'Grappa', 'ESPIRIT'].map((option, index) => {
                                            return (analysisMethod != undefined && topToSecondaryMaps[analysisMethod].indexOf(index) >= 0) ?
                                                <FormControlLabel value={index}
                                                                  disabled={option == 'ESPIRIT'} control={<Radio/>}
                                                                  label={option}/>
                                                : undefined;
                                        })}
                                    </RadioGroup>
                                </FormControl>
                                {(reconstructionMethod != undefined) &&
                                    <CmrPanel header={`${idToSecondaryOptions[reconstructionMethod]} settings`}
                                              expanded={true}
                                              className={' border-0'} cardProps={{className: 'ms-0 me-0 mt-0 mb-0'}}>

                                        <CmrCheckbox className='me-2 ms-1' checked={!flipAngleCorrection}
                                                     defaultChecked={!flipAngleCorrection}
                                                     onChange={(event) => {
                                                         dispatch(setupSetters.setFlipAngleCorrection(!event.target.checked))
                                                     }}>
                                            No Flip Angle Correction
                                        </CmrCheckbox>
                                        {(flipAngleCorrection) &&
                                            <SelectUpload fileSelection={uploadedData} onSelected={(file) => {
                                                dispatch(setupSetters.setFlipAngleCorrectionFile(file));
                                            }} maxCount={1}
                                                          createPayload={createPayload}
                                                          onUploaded={uploadResHandlerFactory(setupSetters.setFlipAngleCorrectionFile)}
                                                          style={{
                                                              height: 'fit-content',
                                                              marginTop: 'auto',
                                                              marginBottom: 'auto'
                                                          }}
                                                          buttonText='choose FA map'
                                                          chosenFile={faMap?.options.filename}
                                            />
                                        }
                                        <Divider variant="middle"
                                                 sx={{marginTop: '15pt', marginBottom: '15pt', color: 'gray'}}/>
                                        {(secondaryToCoilMethodMaps[reconstructionMethod] && secondaryToCoilMethodMaps[reconstructionMethod].length != 0) &&
                                            <Fragment>
                                                <FormControl
                                                    onChange={(event) => {
                                                        //@ts-ignore
                                                        dispatch(setupSetters.setLoadSensitivity(event.target.value == 'true'));
                                                    }}>
                                                    <RadioGroup
                                                        row
                                                        aria-labelledby="demo-row-radio-buttons-group-label"
                                                        name="row-radio-buttons-group"
                                                        value={loadSensitivity}
                                                    >
                                                        <FormControlLabel value={true} disabled={true} control={<Radio/>}
                                                                          label="Load Coil Sensitivities"/>
                                                        <FormControlLabel value={false} control={<Radio/>}
                                                                          label="Calculate Coil Sensitivities"/>
                                                        {(loadSensitivity) ?
                                                            <SelectUpload fileSelection={uploadedData}
                                                                          onSelected={(file) => {
                                                                              dispatch(setupSetters.setSensitivityMapSource(file));
                                                                          }} maxCount={1}
                                                                          createPayload={createPayload}
                                                                          onUploaded={uploadResHandlerFactory(setupSetters.setSensitivityMapSource)}
                                                                          style={{
                                                                              height: 'fit-content',
                                                                              marginTop: 'auto',
                                                                              marginBottom: 'auto'
                                                                          }}
                                                                          buttonText='choose sensitivity map source'
                                                                          chosenFile={sensitivityMapSource?.options.filename}
                                                            /> : <FormControl className='m-3'
                                                                              onChange={(event) => {
                                                                                  //@ts-ignore
                                                                                  dispatch(setupSetters.setSensitivityMapMethod(event.target.value))
                                                                              }}>
                                                                <InputLabel id="css-label">Coil sensitivities
                                                                    calculation method</InputLabel>
                                                                <Select
                                                                    labelId="css-label"
                                                                    value={sensitivityMapMethod}
                                                                    label="Coil sensitivities calculation method"
                                                                    id="demo-simple-select"
                                                                    sx={{width: '300pt'}}
                                                                    onChange={(event) => {
                                                                        dispatch(setupSetters.setSensitivityMapMethod(event.target.value));
                                                                    }}
                                                                >
                                                                    {['inner', 'innerACL'].map((value, index) => {
                                                                        return (secondaryToCoilMethodMaps[reconstructionMethod].indexOf(value) >= 0) ?
                                                                            <MenuItem
                                                                                value={value}>{coilOptionAlias[value]}</MenuItem>
                                                                            : undefined;
                                                                    })}
                                                                </Select>
                                                            </FormControl>}
                                                        {/*<InputLabel id="css-label">Age</InputLabel>*/}
                                                    </RadioGroup>
                                                </FormControl>
                                                <Divider variant="middle"
                                                         sx={{marginTop: '15pt', marginBottom: '15pt', color: 'gray'}}/>
                                            </Fragment>}
                                        {(reconstructionMethod==3) &&
                                            <React.Fragment>
                                                <CmrLabel style={{marginLeft:'3pt', marginBottom:'15pt'}}>Kernel Size</CmrLabel>
                                                <div className='ms-3' style={{
                                                    height: 'fit-content',
                                                    marginRight: 'auto',
                                                    marginTop: '5pt',
                                                    width: '362px'
                                                }}>
                                                    <DataGrid
                                                        rows={kernelSizeRows}
                                                        slots={{
                                                            columnHeaders: () => null,
                                                        }}
                                                        autoHeight
                                                        hideFooterPagination
                                                        hideFooterSelectedRowCount
                                                        hideFooter={true}
                                                        columns={kernelSizeColumns}
                                                        sx={{
                                                            '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {display: 'none'}
                                                        }}
                                                        onCellEditStop={(params: GridCellEditStopParams, event) => {
                                                            // console.log(params)
                                                            // console.log(event)
                                                            // return;
                                                            //@ts-ignore
                                                            if (event.target == undefined || !isNaN(event.target.value))
                                                                return;
                                                        }}
                                                    />
                                                </div>
                                                <Divider variant="middle"
                                                         sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
                                            </React.Fragment>
                                        }
                                        {(decimateMapping[reconstructionMethod]) &&
                                            <Fragment>
                                                <CmrCheckbox className='m-1' defaultChecked={decimateData}
                                                             checked={decimateData} onChange={
                                                    (event) =>
                                                        dispatch(setupSetters.setDecimate(event.target.checked))}>
                                                    Decimate Data
                                                </CmrCheckbox>

                                                <Divider variant="middle"
                                                         sx={{marginTop: '15pt', marginBottom: '15pt', color: 'gray'}}/>
                                            </Fragment>}
                                        {(decimateMapping[reconstructionMethod] && decimateData) &&
                                            <div className='ms-3' style={{
                                                height: 'fit-content',
                                                marginRight: 'auto',
                                                marginTop: '5pt',
                                                width: '362px'
                                            }}>
                                                <DataGrid
                                                    rows={rows}
                                                    slots={{
                                                        columnHeaders: () => null,
                                                    }}
                                                    autoHeight
                                                    hideFooterPagination
                                                    hideFooterSelectedRowCount
                                                    hideFooter={true}
                                                    columns={columns}
                                                    sx={{
                                                        '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {display: 'none'}
                                                    }}
                                                    onCellEditStop={(params: GridCellEditStopParams, event) => {
                                                        // console.log(params)
                                                        // console.log(event)
                                                        // return;
                                                        //@ts-ignore
                                                        if (event.target == undefined || !isNaN(event.target.value))
                                                            return;
                                                        //@ts-ignore
                                                        let value=Number(event.target.value);
                                                        if (params.id == '1') {
                                                            dispatch(setupSetters.setDecimateAccelerations1(Math.max(value,0)));
                                                        } else if(params.id == '2') {
                                                            dispatch(setupSetters.setDecimateAccelerations2(Math.max(value,0)));
                                                        }
                                                        else if (params.id == '3') {
                                                            dispatch(setupSetters.setDecimateACL(value));
                                                        }

                                                    }}
                                                />
                                                <Divider variant="middle" sx={{marginTop: '15pt', marginBottom: '15pt', color: 'gray'}}/>
                                            </div>
                                        }
                                       <Row>
                                           {
                                               <CmrCheckbox className='m-1' onChange={()=>{}} defaultChecked={true}
                                                            checked={true}>
                                                   Save matlab
                                               </CmrCheckbox>
                                           }
                                           {[1,2].indexOf(reconstructionMethod)>=0&&<CmrCheckbox className='m-1' onChange={()=>{}} defaultChecked={true}
                                                        checked={true}>
                                               Save coil sensitivities
                                           </CmrCheckbox>}
                                           {[2].indexOf(reconstructionMethod)>=0&&<CmrCheckbox className='m-1' onChange={()=>{}} defaultChecked={true}
                                                                                                 checked={true}>
                                               Save gFactor
                                           </CmrCheckbox>}
                                       </Row>
                                        <Divider variant="middle" sx={{marginTop: '15pt', marginBottom: '15pt', color: 'gray'}}/>
                                        <CmrButton sx={{width: '100%'}} variant={"outlined"} color={'success'}
                                                   onClick={() => {
                                                       let state = store.getState();
                                                       snr = state.setup.activeSetup;
                                                       if (editing != -1) {
                                                           setEditedJSON(snr);
                                                           setEditContent(JSON.stringify(snr, undefined, '\t'));
                                                       } else {
                                                           setPreview(JSON.stringify(snr, null, '\t'));
                                                           setJobAlias(`${snr.options.reconstructor.options.signal?.options.filename}-${snr.name}`)
                                                       }
                                                   }}>{editing != -1 ? 'Complete Editing' : 'Queue Job'}</CmrButton>
                                        {(previewContent) &&
                                            <SNRPreview previewContent={previewContent} alias={jobAlias}
                                                        setAlias={(event) => {
                                                            //@ts-ignore
                                                            setJobAlias(event.target.value)
                                                        }}
                                                        edit={() => {
                                                        }} queue={(jobAlias:string) => {
                                                dispatch(setupSetters.compileSNRSettings(jobAlias));
                                                setJobSelectionModel([...jobSelectionModel, newJobId]);
                                                setTimeout(() => setOpenPanel([0]), 500);
                                            }}
                                                        handleClose={() => {
                                                            setPreview(undefined);
                                                        }}/>}
                                    </CmrPanel>}
                            </CmrPanel>
                        </CmrCollapse>}
                </CmrPanel>
            </CmrCollapse>
            <div style={{height: '69px'}}></div>
        </Fragment>
    );
};

export default Setup;
