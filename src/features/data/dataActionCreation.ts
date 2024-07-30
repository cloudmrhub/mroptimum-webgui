import axios, { AxiosResponse} from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    DATAAPI,
    DATA_RENAME_API,
    DATA_DELETE_API,
    DATAUPLOADINIT,
    DATAUPLOADFINALIZE
} from "../../Variables";
import {LambdaFile} from "../../common/components/Cmr-components/upload/Upload";
import {getFileExtension} from "../../common/utilities";
import {anonymizeTWIX} from "../../common/utilities/file-transformation/anonymize";
import {AxiosRequestConfig} from "axios/index";
import {setupSetters, setupSlice} from "../setup/setupSlice";

export const getUploadedData = createAsyncThunk('GetUploadedData', async (accessToken: string) => {
    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`}
    }
    try{
        const response = await axios.get(DATAAPI, config);
        console.log(response.data);
        return response.data;
    }catch(e){
        console.log(e);
        return undefined;
    }
});

export const uploadData = createAsyncThunk('UploadData', async(
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
        const finalizeResponse = await axios.post(DATAUPLOADFINALIZE, {
            uploadId,
            parts: uploadedParts,
            Key: Key
        },payload.config);

        console.log(finalizeResponse);

        console.log('all uploads completed');
        if(onUploaded)
            onUploaded(initResponse,file);

        thunkAPI.dispatch(getUploadedData(accessToken));
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
            const transformedFile = await anonymizeTWIX(file);
            file = transformedFile;
        }
        const UploadHeaders: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Api-Key':uploadToken
            },
        };
        return {destination: DATAUPLOADINIT, lambdaFile: lambdaFile, file: file, config: UploadHeaders};
    }
};

// Here's the corresponding rename function for Data
export const renameUploadedData = createAsyncThunk('RenameUploadedData', async (arg:{accessToken: string, fileId: number,fileName:string},thunkAPI) => {
    const config = {
        headers: {
            Authorization: `Bearer ${arg.accessToken}`,
        },
    };
    const response = await axios.post(DATA_RENAME_API, {fileid: arg.fileId,
        filename:arg.fileName}, config);
    if(response.status === 200)
        await thunkAPI.dispatch(getUploadedData(arg.accessToken));
});

export const deleteUploadedData = createAsyncThunk('DeleteUploadedData', async (arg: { accessToken: string, fileId: number },thunkAPI) => {
    const config = {
        headers: {
            Authorization: `Bearer ${arg.accessToken}`,
        },
        params: {
            fileid: arg.fileId
        }
    };
    const response = await axios.get(`${DATA_DELETE_API}`, config);
    if (response.status == 200)
        await thunkAPI.dispatch(getUploadedData(arg.accessToken));
});
