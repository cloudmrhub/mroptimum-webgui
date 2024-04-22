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
import {anonymizeTWIX} from "../../common/utilities/file-transformation/anonymize";
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