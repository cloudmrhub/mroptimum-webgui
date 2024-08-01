import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    DATAUPLOADFINALIZE,
    DATAUPLOADINIT,
    JOBS_API,
    JOBS_DELETE_API,
    JOBS_RENAME_API,
    JOBS_RETRIEVE_API, JOBUPLOADFINALIZE, JOBUPLOADINIT
} from '../../Variables';
import {Job} from "./jobsSlice";
import {setupSetters} from "../setup/setupSlice";
import {LambdaFile} from "../../common/components/Cmr-components/upload/Upload";
import {getFileExtension} from "../../common/utilities";
import {is_safe_twix} from "../../common/utilities/file-transformation/anonymize";
import {getUploadedData} from "../data/dataActionCreation";
export const getUpstreamJobs = createAsyncThunk('GetJobs', async (accessToken: string) => {
    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    };
    const response = await axios.get(JOBS_RETRIEVE_API, config);
    return response.data;
});

export const renameUpstreamJob = createAsyncThunk('RenameJob', async (arg:{accessToken: string, jobReference: Job}) => {
    const config = {
        headers: {
            Authorization: `Bearer ${arg.accessToken}`,
        },
    };
    const response = await axios.post(JOBS_RENAME_API, arg.jobReference, config);
    if(response.status==200)
        getUpstreamJobs(arg.accessToken);
});

export const deleteUpstreamJob = createAsyncThunk('DeleteJob', async (arg: { accessToken: string, jobId: string }) => {
    const config = {
        headers: {
            Authorization: `Bearer ${arg.accessToken}`,
        },
    };
    const response = await axios.delete(`${JOBS_DELETE_API}/${arg.jobId}`, config);
    if (response.status == 200)
        getUpstreamJobs(arg.accessToken);
});

export const uploadJob = createAsyncThunk('UploadJob', async(
    {accessToken, uploadToken, file, fileAlias, onProgress, onUploaded, uploadTarget}:
        {accessToken:string,uploadToken:string,file:File,fileAlias:string,
            onProgress?:(progress:number)=>void,uploadTarget?:string,
            onUploaded?:(res:AxiosResponse,file:File)=>void},thunkAPI)=>{
    try{
        const FILE_CHUNK_SIZE = 10 * 1024 * 1024; // 5MB chunk size
        let payload = await createPayload(accessToken, uploadToken, file, fileAlias);
        if(payload==undefined)
            return {code:403,response:'file not found',file:undefined,uploadTarget:uploadTarget}
        thunkAPI.dispatch(setupSetters.setUploadProgress({target:uploadTarget,progress:0}));
        // @ts-ignore
        async function uploadPartWithRetries(partUrl:string,
                                             part:any, cancelTokenSource:any,
                                             index:number, retries = 2) {
            try {
                const response = await axios.put(partUrl, part, {
                    headers: {
                        'Content-Type': ""
                    },
                    onUploadProgress: progressEvent => {
                        totalUploadedParts[index] = progressEvent.loaded;
                        const totalUploaded = totalUploadedParts.reduce((a, b) => a + b, 0);
                        const totalProgress = totalUploaded / totalSize;
                        onProgress&&onProgress(totalProgress);
                        thunkAPI.dispatch(setupSetters.setUploadProgress({target:uploadTarget,progress:totalProgress}));
                    },
                    cancelToken: cancelTokenSource.token
                });
                return response;
            } catch (error) {
                if (axios.isCancel(error)) {
                    console.log('Upload cancelled:', partUrl);
                } else if (retries > 0) {
                    console.log(`Retrying upload for part: ${partUrl}, attempts remaining: ${retries}`);
                    // Cancel the current request before retrying
                    cancelTokenSource.cancel('Cancelling the current request before retry.');
                    const newCancelTokenSource = axios.CancelToken.source();
                    return await uploadPartWithRetries(partUrl, part, newCancelTokenSource,index, retries - 1);
                } else {
                    throw error; // rethrow the error after exhausting retries
                }
            }
        }
        const initResponse = await axios.post(payload.destination, payload.lambdaFile,payload.config);
        console.log(initResponse);

        const { uploadId, partUrls, Key} = initResponse.data;

        // Step 2: Prepare file parts
        const fileParts = [];
        for (let i = 0; i < file.size; i += FILE_CHUNK_SIZE) {
            const part = file.slice(i, i + FILE_CHUNK_SIZE);
            fileParts.push(part);
        }

        let totalSize = payload.file.size;
        const totalUploadedParts = new Array(fileParts.length).fill(0);
        // Step 3: Upload each part
        const uploadedParts = await Promise.all(fileParts.map(async (part, index) => {
            let partUrl = partUrls[index];

            const cancelTokenSource = axios.CancelToken.source();
            const partResponse = await uploadPartWithRetries(partUrl, part, cancelTokenSource,index);

            const etag = partResponse?.headers['etag'].replace(/"/g, '');
            return { partNumber: index + 1, etag };
        }));

        // Step 4: Finalize the upload
        const finalizeResponse = await axios.post(JOBUPLOADFINALIZE, {
            uploadId,
            parts: uploadedParts,
            Key: Key
        },payload.config);

        console.log(finalizeResponse);

        console.log('all uploads completed');
        if(onUploaded)
            onUploaded(initResponse,file);

        thunkAPI.dispatch(getUpstreamJobs(accessToken));
        return {code:200, response: initResponse.data.response, file:payload.lambdaFile,uploadTarget:uploadTarget};
    }catch (e:any) {
        console.log("Following error encountered during uploading:");
        console.error(e);
        return {code:500,response: e.response, file:undefined, uploadTarget:uploadTarget}
    }
});

const createPayload = async (accessToken:string, uploadToken:string, file: File, fileAlias: string) => {
    if (file) {
        const lambdaFile: LambdaFile = {
            "filename": fileAlias,
            "filetype": file.type,
            "filesize": `${file.size}`,
            "filemd5": '',
            "file": file
        }
        console.log(file.type);
        const fileExtension = getFileExtension(file.name);

        if (fileExtension == 'dat') {
            let safe = await is_safe_twix(file);
            if (!safe){
                alert('This file contains PIH data. Please anonymize the file before uploading');
                return undefined;
            }
        }
        const UploadHeaders: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Api-Key':uploadToken
            },
        };
        return {destination: JOBUPLOADINIT, lambdaFile: lambdaFile, file: file, config: UploadHeaders};
    }
};