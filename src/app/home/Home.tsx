import React, {Fragment, useEffect, useState} from 'react';
import './Home.scss';
import { Row, Col } from 'antd';
import CmrCollapse from '../../common/components/Cmr-components/collapse/Collapse';
import CmrPanel from '../../common/components/Cmr-components/panel/Panel';
import CmrTable from '../../common/components/CmrTable/CmrTable';
import CmrProgress from '../../common/components/Cmr-components/progress/Progress';
import { getUploadedData } from '../../features/data/dataActionCreation';
import { useAppDispatch, useAppSelector } from '../../features/hooks';
import {dataSlice, UploadedFile} from '../../features/data/dataSlice';
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import NameDialog from "../../common/components/Cmr-components/rename/edit";
import {getUpstreamJobs, renameUpstreamJob} from "../../features/jobs/jobActionCreation";
import {jobsSlice} from "../../features/jobs/jobsSlice";
import Confirmation from "../../common/components/Cmr-components/dialogue/Confirmation";

const Home = () => {
    const uploadedFilesColumns = [

        {
            headerName: 'File Name',
            dataIndex: 'fileName',
            field: 'fileName',
            editable: true,
            flex: 1,
        },
        {
            headerName: 'Date Submitted',
            dataIndex: 'createdAt',
            field: 'createdAt',
            flex: 1,
        },
        {
            headerName: 'Status',
            dataIndex: 'status',
            field: 'status',
            flex: 1,
        },
        {
            field: 'actions',
            headerName: 'Actions',
            sortable: false,
            width: 160,
            disableClickEventBubbling: true,
            renderCell: (params:any) => {
                let index =  files.findIndex(row => row.id === params.id);
                return (
                    <div>
                        <IconButton onClick={() => {
                            setOriginalName(files[index].fileName);
                            setNameDialogOpen(true);
                            setRenamingCallback(()=>(newName:string)=>{
                                // In case of working API
                                // let jobReference = jobsData[renameFileIndex];
                                // jobReference.alias = newName;
                                // renameUpstreamJob({accessToken, jobReference});

                                // In case of non-working API, change name locally
                            dispatch(dataSlice.actions.renameData({index:index,alias:newName}));});
                        }}>
                            <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => {/* Download logic here */}}>
                            <GetAppIcon />
                        </IconButton>
                        <IconButton onClick={() => {
                            setName(`Deleting data ${params.row.id}`);
                            setMessage(`Please confirm that you are deleting data ${params.row.id}.`);
                            setColor('error');
                            setConfirmCallback(()=>()=>{
                                dispatch(dataSlice.actions.deleteData({index}));
                            });
                            setOpen(true);
                        }}>
                            <DeleteIcon />
                        </IconButton>
                    </div>
                );
            },
        }
    ];

    const jobsColumns = [
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
            field: 'options',
            headerName: 'Options',
            sortable: false,
            width: 160,
            disableClickEventBubbling: true,
            renderCell: (params:any) => {
                let index =  jobsData.findIndex(row => row.id === params.id);
                return (
                    <div>
                        <IconButton onClick={() => {
                            setOriginalName(jobsData[index].alias);
                            setNameDialogOpen(true);
                            setRenamingCallback(()=>(newName:string)=>{
                                // In case of working API
                                // let jobReference = jobsData[renameFileIndex];
                                // jobReference.alias = newName;
                                // renameUpstreamJob({accessToken, jobReference});

                                // In case of non-working API, change name locally
                                dispatch(jobsSlice.actions.renameJob({index:index,alias:newName}));
                            });
                        }}>
                            <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => {/* Download logic here */
                            params.row.files.forEach((file:UploadedFile) => {
                                let url = file.link;
                                if(url=="unknown")
                                    return;
                                // Create an anchor element
                                const a = document.createElement('a');
                                a.href = url;

                                // Extract the file name from the URL, if possible
                                a.download = `${file.fileName}.${url.split('.').pop()}`;

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
                        <IconButton onClick={() => {
                            setName(`Deleting job ${params.row.id}`);
                            setMessage(`Please confirm that you are deleting job ${params.row.id}.`);
                            setColor('error');
                            setConfirmCallback(()=>()=>{
                                dispatch(jobsSlice.actions.deleteJob({index}));
                            });
                            setOpen(true);
                        }}>
                            <DeleteIcon />
                        </IconButton>
                    </div>
                );
            },
        }
    ];

    const dispatch = useAppDispatch();
    const { accessToken } = useAppSelector((state) => state.authenticate);
    const { files } = useAppSelector((state) => state.data);
    const jobsData = useAppSelector((state)=>state.jobs.jobs);
    const [nameDialogOpen, setNameDialogOpen] = useState(false);
    const [renamingCallback, setRenamingCallback]=useState<(alias:string)=>void>(()=>{});
    const [originalName, setOriginalName]=useState('');

    const [name, setName] = useState<string | undefined>(undefined);
    const [message, setMessage] = useState<string | undefined>(undefined);
    const [color, setColor] = useState<"inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning" | undefined>(undefined);
    const [open, setOpen] = useState<boolean>(false);
    const [confirmCallback, setConfirmCallback] = useState<() => void>(() => {});


    useEffect(() => {
        //@ts-ignore
        dispatch(getUploadedData(accessToken));
        //@ts-ignore
        dispatch(getUpstreamJobs(accessToken));
        console.log("dispatched");
    }, []);

    return (
       <Fragment>
           <CmrCollapse accordion={false} defaultActiveKey={[0,1]} expandIconPosition="right">
               <CmrPanel key="0" header="Data" className='mb-2'>
                   <CmrTable dataSource={[...files].reverse()} columns={uploadedFilesColumns} />
               </CmrPanel>
               <NameDialog  open={nameDialogOpen} setOpen = {setNameDialogOpen} originalName={originalName}
                            renamingCallback={renamingCallback}/>
               <CmrPanel key="1" header="Jobs">
                   <CmrTable dataSource={jobsData} columns={jobsColumns} />
               </CmrPanel>
               <Confirmation
                   name={name}
                   message={message}
                   color={color}
                   open={open}
                   setOpen={setOpen}
                   confirmCallback={confirmCallback}
                   cancellable={true}
               />
           </CmrCollapse>
           <div style={{height:'69px'}}></div>
       </Fragment>
    );
};

export default Home;
