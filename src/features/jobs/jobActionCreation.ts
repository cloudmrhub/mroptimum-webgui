import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {JOBS_API, JOBS_DELETE_API, JOBS_RENAME_API, JOBS_RETRIEVE_API} from '../../Variables';
import {Job} from "./jobsSlice";
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