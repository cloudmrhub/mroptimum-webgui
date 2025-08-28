import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Job } from "../jobs/jobsSlice";
import { getUpstreamJobs } from "../jobs/jobActionCreation";
import { JOBS_API, APP_NAME } from "../../Variables";
import { setupSetters } from "./setupSlice";

export const submitJobs = createAsyncThunk('SUBMIT_JOBS',
    async ({ accessToken, jobQueue, queueToken }: { accessToken: string, jobQueue: Job[], queueToken: string }, thunkAPI) => {
        let responses = [];

        for (let job of jobQueue) {
            console.log(job);
            console.log(queueToken);
            try {
                let res = await axios.post(
                    JOBS_API,
                    JSON.stringify({
                        ...job.setup,
                        cloudapp_name:APP_NAME
                    } ),
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            accept: '*/*',
                            'X-Api-Key': queueToken,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                responses.push({
                    id: job.id,
                    status: res.status
                });
            } catch (error: any) {
                if (error?.response?.status === 429) {
                    thunkAPI.dispatch(setupSetters.setQuotaExceeded(true));
                    break;
                } else {
                    console.error("Submission failed for job", job.id, error);
                    // optionally still push an error status or skip
                }
            }
        }

        // //Update upstream jobs right after submission
        thunkAPI.dispatch(getUpstreamJobs(accessToken));

        // Return whether the submission was successful
        return responses;
    }
);
