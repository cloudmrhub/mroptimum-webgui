import React, {Fragment, useEffect, useState} from 'react';
import './Results.scss';
import CmrCollapse from '../../common/components/Cmr-components/collapse/Collapse';
import CmrPanel from '../../common/components/Cmr-components/panel/Panel';
import CmrTable from '../../common/components/CmrTable/CmrTable';
import { getUploadedData } from '../../features/data/dataActionCreation';
import { useAppDispatch, useAppSelector } from '../../features/hooks';
import { UploadedFile } from '../../features/data/dataSlice';
import IconButton from "@mui/material/IconButton";
import GetAppIcon from "@mui/icons-material/GetApp";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NiiVue, {nv} from "../../common/components/src/Niivue";
import {Job} from "../../features/jobs/jobsSlice";
import axios from "axios";
import {ROI_GET, UNZIP} from "../../Variables";
import {getUpstreamJobs} from "../../features/jobs/jobActionCreation";
import {ROI} from "../../features/rois/roiSlice";
import {getPipelineROI} from "../../features/rois/roiActionCreation";
import {Button} from "@mui/material";
import {store} from "../../features/store";

interface NiiFile {
    filename:string;
    id:number;
    dim:number;
    name:string;
    type:string;
    link:string;
}

const Results = () => {
    const [completedJobsData, setCompletedJobsData] = useState<Array<UploadedFile>>();

    const dispatch = useAppDispatch();
    const { accessToken } = useAppSelector((state) => state.authenticate);
    const results = useAppSelector((state)=>
        state.jobs.jobs);
    const [volumes, setVolumes] = useState<{url:string, name:string}[]>( []);
    // const [rois, setROIS] = useState<ROI[]>([]);
    const [pipelineID, setPipelineID] = useState<string>("");
    const rois:ROI[] = useAppSelector(state=>{
        return (state.roi.rois[pipelineID]==undefined)?[]:state.roi.rois[pipelineID];
    })
    console.log(rois);
    const roiColumns=[
        {
            headerName:'ROI ID',
            dataIndex: 'id',
            field: 'id',
            flex: 1,
        },
        {
            headerName: 'ROI Name',
            field: 'filename',
            flex: 3,
        },
        {
            headerName: 'Date Submitted',
            field: 'created_at',
            flex: 2,
        },
        {
            headerName: 'Status',
            dataIndex: 'status',
            field: 'status',
            flex: 1,
        },
    ];
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
            renderCell: (params:{row:Job}) => {
                return (
                    <div>
                        <IconButton disabled={params.row.status!='completed'} onClick={() => {
                            let counter = 0;
                            params.row.files.forEach(file => {
                                axios.post(UNZIP, JSON.parse(file.location),{
                                    headers: {
                                        Authorization:`Bearer ${accessToken}`
                                    }
                                }).then(value => {
                                    let niis:NiiFile[] = value.data;
                                    let volumes = niis.map((value)=>{
                                        return {url:value.link, name: value.filename};
                                    });
                                    // let volumes = [{url:niis[1].link,name:niis[1].filename}]
                                    setVolumes(volumes);
                                    nv.loadVolumes([volumes[0]]);
                                    // nv.createEmptyDrawing();
                                }).catch((reason)=>{
                                    console.log(reason);
                                    console.log(JSON.parse(file.location));
                                });
                            });
                            // Set pipeline ID
                            setPipelineID(params.row.pipeline_id);
                            // Set roi
                            //@ts-ignore
                            dispatch(getPipelineROI({pipeline: params.row.pipeline_id,
                                accessToken:accessToken}));
                            setOpenPanel([1]);
                        }}>
                            <PlayArrowIcon sx={{
                                color: (params.row.status!='completed')?'#a9b7a9':'#4CAF50', // green color
                                '&:hover': {
                                    color: '#45a049', // darker green when hovering
                                },
                            }}/>
                        </IconButton>
                        <IconButton onClick={(e) => {
                            params.row.files.forEach(file => {
                                let url = file.link;
                                if(url=="unknown")
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
                    </div>
                );
            },
        }
    ];

    const [openPanel, setOpenPanel] = useState([0]);

    useEffect(() => {
        //@ts-ignore
        dispatch(getUploadedData(accessToken));
        //@ts-ignore
        dispatch(getUpstreamJobs(accessToken));
        setTimeout( ()=>{
            if(Date.now()-lastUpdated>=60000){//Only auto get job state after 1 minute
                setLastUpdated(Date.now());
                //@ts-ignore
                dispatch(getUpstreamJobs(accessToken));
            }
        },60000);
    }, []);

    const [lastUpdated, setLastUpdated] = useState(Date.now());

    return (
        <Fragment>
            <CmrCollapse accordion={false} expandIconPosition="right" activeKey={openPanel} onChange={(key: any) => {
                setOpenPanel(key)
            }}>
                <CmrPanel header='Results' className={'mb-2'} key={'0'}>
                    <CmrTable  dataSource={results} columns={completedJobsColumns}/>
                    <Button className={'mt-3'} fullWidth variant={'contained'} onClick={()=>{
                        //@ts-ignore
                        dispatch(getUpstreamJobs(accessToken));
                    }}>Refresh</Button>
                </CmrPanel>
                <CmrPanel header='Inspection' key={'1'}>
                    <NiiVue volumes={volumes} key={pipelineID} rois={rois} pipelineID={pipelineID} saveROICallback={()=>{
                        //@ts-ignore
                        dispatch(getPipelineROI({pipeline: pipelineID,
                            accessToken:accessToken}));
                    }}
                    accessToken={accessToken}/>
                    <CmrTable name={'ROI Table'}  className={'mt-5'} dataSource={rois} columns={roiColumns}/>
                </CmrPanel>
            </CmrCollapse>
            <div style={{height:'69px'}}></div>
        </Fragment>
    );
};

export default Results;
