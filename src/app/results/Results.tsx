import React, {Fragment, useEffect, useState} from 'react';
import './Results.scss';
import { Row, Col } from 'antd';
import CmrCollapse from '../../common/components/Cmr-components/collapse/Collapse';
import CmrPanel from '../../common/components/Cmr-components/panel/Panel';
import CmrTable from '../../common/components/CmrTable/CmrTable';
import CmrProgress from '../../common/components/Cmr-components/progress/Progress';
import { getUploadedData } from '../../features/data/dataActionCreation';
import { useAppDispatch, useAppSelector } from '../../features/hooks';
import { UploadedFile } from '../../features/data/dataSlice';
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import CmrButton from "../../common/components/Cmr-components/button/Button";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NiiVue, {nv} from "../../common/components/src/Niivue";
import {Job} from "../../features/jobs/jobsSlice";
import {setupSetters} from "../../features/setup/setupSlice";

const Results = () => {
    const [completedJobsData, setCompletedJobsData] = useState<Array<UploadedFile>>();

    const dispatch = useAppDispatch();
    const { accessToken } = useAppSelector((state) => state.authenticate);
    const results = useAppSelector((state)=>
        state.jobs.jobs);
    const [volumes, setVolumes] = useState<{url:string}[]>( []);
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
                            let files = params.row.files;
                            let volumes = Array.from(files,(file)=>{return {url:file.link};});
                            setVolumes(volumes);
                            nv.loadVolumes(volumes);
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
    }, []);

    return (
        <Fragment>
            <CmrCollapse accordion={false} expandIconPosition="right" activeKey={openPanel} onChange={(key: any) => {
                setOpenPanel(key)
            }}>
                <CmrPanel header='Results' className={'mb-2'} key={'0'}>
                    <CmrTable  dataSource={results} columns={completedJobsColumns}/>
                </CmrPanel>
                <CmrPanel header='Inspection' key={'1'}>
                    <NiiVue volumes={volumes}/>
                </CmrPanel>
            </CmrCollapse>
            <div style={{height:'69px'}}></div>
        </Fragment>
    );
};

export default Results;
