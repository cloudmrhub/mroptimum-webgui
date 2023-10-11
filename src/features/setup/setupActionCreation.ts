import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {Job} from "../jobs/jobsSlice";
import {getUpstreamJobs} from "../jobs/jobActionCreation";

const SUBMITJOB = 'http://localhost:5010/submit';

export const submitJobs = createAsyncThunk('SUBMIT_JOBS',
    async ({accessToken,jobQueue}:{accessToken:string, jobQueue:Job[]}, thunkAPI) => {
    const taskQueue = jobQueue.map((value)=>{
        return {version: "v0",
            autenticationtoken: accessToken,
            alias: "trial 1",
            output: {
                coilsensitivity: true,
                gfactor: true,
                matlab: true
            },
            task:value};
    });
    console.log(JSON.stringify(taskQueue,undefined,'\t'));
    const response = await axios.post(SUBMITJOB, taskQueue);
    //Update upstream jobs right after submission
    thunkAPI.dispatch(getUpstreamJobs(accessToken));
    //Return whether the submission was successful
    return response.data.success;
});