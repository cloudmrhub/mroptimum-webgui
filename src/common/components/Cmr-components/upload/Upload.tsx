import React, {useState} from 'react';
import './Upload.scss';
import {Box, Button, SxProps, Theme} from '@mui/material';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import UploadWindow from "./UploadWindow";
import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import Typography from "@mui/material/Typography";

export interface LambdaFile {
    "filename": string;
    "filetype": string;
    "filesize": string;
    "filemd5": string;
    "file": File;
}
/**
 * Consists of general settings for upload component
 * functionalities and call back methods evoked
 * for specific interactions
 */
interface CMRUploadProps extends React.HTMLAttributes<HTMLDivElement>{
    //Determines if the upload buttons should retain the uploaded
    //file after upload, or if it should refresh for a new session
    retains?:boolean;
    maxCount: number;
    onRemove?:(removedFile: File)=>void;
    /**
     * Allows access to file content prior to uploading.
     * If returned value from the method is false,
     * prevents the file upload process. Called before
     * create payload.
     * @param file
     */
    beforeUpload?: (file:File)=>Promise<boolean>;
    createPayload: (file: File,fileAlias:string, fileDatabase: string)=>
        (Promise<{destination: string, lambdaFile:LambdaFile, config: AxiosRequestConfig}|undefined>);
    onUploadProgressUpdate?:(loaded: number, total: number)=>void|undefined;
    onUploaded: (res: AxiosResponse, file: File)=>void;
    sx?:  SxProps<Theme>|undefined;
    rest?: any;
    fileExtension?: string;
    uploadStarted?:()=>void;
    uploadEnded?:()=>void;
    //Override this to replace the default behavior of uploading
    upload?:(file:File,fileAlias:string,fileDatabase:string)=>Promise<number>;
}


const CmrUpload = (props: CMRUploadProps) => {

    let [open, setOpen] = useState(false);
    /**
     * Life cycle representing the current status of the upload
     * process.
     */
    let [uploading, setUploading] = useState(false);
    let [progress, setProgress] = useState(0);
    let [uploadedFile, setUploadedFile] = useState<string|undefined>(undefined);
    const upload = props.upload==undefined?async (file: File, fileAlias:string, fileDatabase: string)=>{
        setUploading(true);
        if(props.uploadStarted)
            props.uploadStarted();
        let status:any = 0;
        try {
            if(props.beforeUpload!=undefined&&!await props.beforeUpload(file)){
                if(props.uploadEnded)
                    props.uploadEnded();
                setUploading(false);
                return 200;
            }
            let payload = await props.createPayload(file, fileAlias, fileDatabase);
            if(payload==undefined)
                return 0;
            payload.config.onUploadProgress = (progressEvent) => {
                if(progressEvent.total==undefined)
                    return;
                let percentage = (progressEvent.loaded * 99) / progressEvent.total;
                setProgress(+percentage.toFixed(2));
            };
            // console.log(payload.formData)
            const res = await axios.post(payload.destination, payload.lambdaFile, payload.config);
            status = res.status;
            if(status===200){
                // file.name = res.data.response.
                // await axios.post(res.data.upload_url, file)
                console.log(res.data);
                await axios.put(res.data.upload_url, file, {
                    headers: {
                        'Content-Type': file.type
                    }
                })
                await props.onUploaded(res,file);
                setUploadedFile(file.name);
            }
        } catch (err) {
            console.log('Upload mask file error: ', err);
            status = err;
            setOpen(true);
            throw(err);
        } finally {
            if(props.uploadEnded)
                props.uploadEnded();
            setUploading(false);
        }
        return status;
    }:props.upload;

    return (
        <React.Fragment>
            {(!uploading)?

                <Button fullWidth variant={(uploadedFile==undefined)?"contained":"outlined"}
                        onClick={()=>{
                            setOpen(true);
                        }}
                        sx={props.sx}
                >
                    {(uploadedFile==undefined)?"Upload":uploadedFile}
                </Button>
            :
                <Button fullWidth variant={"contained"} sx={{overflowWrap:'inherit'}} color={'primary'} disabled>
                    Uploading {progress}%
                </Button>}
            <UploadWindow open={open} setOpen={setOpen} upload={upload} fileExtension={props.fileExtension}/>
        </React.Fragment>
    );
};

export type {CMRUploadProps};
export default CmrUpload;