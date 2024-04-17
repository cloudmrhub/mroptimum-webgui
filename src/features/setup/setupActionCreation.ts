import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {Job} from "../jobs/jobsSlice";
import {getUpstreamJobs} from "../jobs/jobActionCreation";
import {JOBS_API, JOBS_RETRIEVE_API} from "../../Variables";

export const submitJobs = createAsyncThunk('SUBMIT_JOBS',
    async ({accessToken,jobQueue,queueToken}:{accessToken:string, jobQueue:Job[], queueToken:string}, thunkAPI) => {
    let responses = [];
    for(let job of jobQueue){
        // console.log(job);
        let res = await axios.post(JOBS_API, JSON.stringify(job.setup), {headers:{Authorization:`Bearer ${accessToken}`,
                accept: 'application/json','X-Api-Key':queueToken,'Content-Type': 'application/json'}});
        responses.push({
            id: job.id,
            status: res.status
        })
    }
    // //Update upstream jobs right after submission
    thunkAPI.dispatch(getUpstreamJobs(accessToken));
    // Return whether the submission was successful
    return responses;
});
