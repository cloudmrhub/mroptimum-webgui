import React, {useState} from 'react';
import './Upload.scss';
import {Box, Button, SxProps, Theme} from '@mui/material';
import UploadWindow from "./UploadWindow";
import axios, {AxiosRequestConfig, AxiosResponse} from "axios";

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
    /**
     * This or uploadHandler must be specified
     * @param file
     * @param fileAlias
     * @param fileDatabase
     */
    createPayload?: (file: File,fileAlias:string, fileDatabase: string)=>
        (Promise<{destination: string, lambdaFile:LambdaFile, file:File, config: AxiosRequestConfig}|undefined>);
    onUploadProgressUpdate?:(loaded: number, total: number)=>void|undefined;
    onUploaded: (res: AxiosResponse, file: File)=>Promise<void>|void;
    sx?:  SxProps<Theme>|undefined;
    rest?: any;
    fileExtension?: string;
    uploadStarted?:()=>void;
    uploadEnded?:()=>void;
    uploadFailed?:()=>void;
    uploadProgressed?:(progress:number)=>void;
    /**
     * Override this to replace the default behavior of uploading
     * @param file
     * @param fileAlias
     * @param fileDatabase
     * @param onProgress
     * @param onUploaded
     */
    uploadHandler?:(file:File, fileAlias:string, fileDatabase:string,
                    onProgress?:(progress:number)=>void,
                    onUploaded?:(res:AxiosResponse,file:File)=>void)=>Promise<number>;
    fullWidth?: boolean;
    style?: any;
    /**
     * Displays upload button instead of uploaded file after upload
     * if set to reusable
     */
    reusable?: boolean;
    uploadButtonName?:string;
    /**
     * Processes the uploaded file before performing the upload;
     * @return file/undefined/statuscode undefined to fail the upload, return File
     * to pass the processed file, return number to indicate error code
     * and return to upload window.
     * @param file
     */
    preprocess?:(file:File)=>Promise<File|undefined|number>;
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

   const upload = async (file: File, fileAlias:string, fileDatabase: string)=>{
        setUploading(true);
        const onProgress = (progress:number)=>{
            let percentage = (progress* 99);
            props.uploadProgressed&&props.uploadProgressed(+percentage.toFixed(2));
            setProgress(+percentage.toFixed(2));
        }
        if(props.uploadStarted)
            props.uploadStarted();
        let status:any = 0;
        // try {
            if(props.beforeUpload!=undefined&&!await props.beforeUpload(file)){
                if(props.uploadEnded)
                    props.uploadEnded();
                setUploading(false);
                return 200;
            }
            if(props.preprocess){
                let processed = await props.preprocess(file);
                if(processed==undefined)
                    return failUpload();
                if(typeof processed =='number'){
                    setUploading(false);
                    return processed;
                }
                file = processed as File;
            }
            if(props.uploadHandler!=undefined){
                status = await props.uploadHandler(file,fileAlias,fileDatabase,onProgress,props.onUploaded);
                setUploadedFile(props.reusable?undefined:file.name);
            }else if(props.createPayload){
                let payload = await props.createPayload(file, fileAlias, fileDatabase);
                if(payload==undefined){
                    return failUpload();
                }
                payload.config.onUploadProgress = (progressEvent) => {
                    if(progressEvent.total==undefined)
                        return;
                    onProgress(progressEvent.loaded/progressEvent.total);
                };
                // console.log(payload.formData)
                const res = await axios.post(payload.destination, payload.lambdaFile, payload.config);
                status = res.status;
                if(status===200){
                    // file.name = res.data.response.
                    // await axios.post(res.data.upload_url, file)
                    console.log(res.data);
                    await axios.put(res.data.upload_url, payload.file, {
                        headers: {
                            'Content-Type': payload.file.type
                        }
                    })
                    await props.onUploaded(res,payload.file);
                    setUploadedFile(props.reusable?undefined:payload.file.name);
                }
            }else{
                return failUpload();
            }
            if(props.uploadEnded)
                props.uploadEnded();
            setUploading(false);
            setProgress(0);
        // }
        return status;
    };

    function failUpload(){
        setUploading(false);
        setProgress(0);
        if(props.uploadFailed)
            return props.uploadFailed();
        return 0;
    }

    return (
        <React.Fragment>
            {(!uploading)?

                <Button fullWidth={props.fullWidth} style={props.style} variant={(uploadedFile==undefined)?"contained":"outlined"}
                        onClick={()=>{
                            setOpen(true);
                        }}
                        sx={props.sx}
                >
                    {(uploadedFile==undefined)?(props.uploadButtonName?props.uploadButtonName:"Upload"):uploadedFile}
                </Button>
            :
                <Button fullWidth={props.fullWidth} style={props.style} variant={"contained"} sx={{overflowWrap:'inherit'}} color={'primary'} disabled>
                    Uploading {progress}%
                </Button>}
            <UploadWindow open={open} setOpen={setOpen} upload={upload} fileExtension={props.fileExtension}
                          template={{showFileName:true,showFileSize:true}}/>
        </React.Fragment>
    );
};

export type {CMRUploadProps};
export default CmrUpload;