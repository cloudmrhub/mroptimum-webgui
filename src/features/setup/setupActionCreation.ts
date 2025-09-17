import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { Job, getUpstreamJobs } from "cloudmr-core";
import { setupSetters } from "./setupSlice";
import { getEndpoints } from 'cloudmr-core';
import { AuthenticatedHttpClient } from 'cloudmr-core';
export const submitJobs = createAsyncThunk('SUBMIT_JOBS',
    async ({ jobQueue, queueToken }: { jobQueue: Job[], queueToken: string }, thunkAPI) => {
        const endpoints = getEndpoints();
        let responses = [];

        for (let job of jobQueue) {
            console.log(job);
            console.log(queueToken);
            try {
                let res = await AuthenticatedHttpClient.post(
                    endpoints.JOBS_API,
                    JSON.stringify(job.setup),
                    {
                        headers: {
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
        thunkAPI.dispatch(getUpstreamJobs());

        // Return whether the submission was successful
        return responses;
    }
);
