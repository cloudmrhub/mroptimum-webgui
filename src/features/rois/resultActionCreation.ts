import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {ROI_GET, ROI_UPLOAD, UNZIP} from '../../Variables';
import {resultActions, ROI, Volume} from "./resultSlice";
import {nv} from "../../common/components/src/Niivue";
import {Job, sampleJob} from "../jobs/jobsSlice";
import {defaultSNR} from "../setup/setupSlice";

export interface NiiFile {
    filename:string;
    id:number;
    dim:number;
    name:string;
    type:string;
    link:string;
}

export const getPipelineROI = createAsyncThunk('GetROI', async ({accessToken, pipeline}:{accessToken:string, pipeline:string}) => {
    const config = {
        headers: {
            Authorization:`Bearer ${accessToken}`
        },
        params: {
            pipeline_id: pipeline,
        }
    };
    const response = await axios.get(ROI_GET, config);
    console.log(response);
    return {rois:response.data, pipeline_id:pipeline};
});


export const loadResult = createAsyncThunk('LoadResult', async ({accessToken,job}:{accessToken:string,job:Job})=>{
    if(job.pipeline_id==sampleJob.pipeline_id){
        return sampleResult;
    }
    let volumes:Volume[] = [];
    let file = job.files[0];
    console.log(file);
    let niis = <NiiFile[]> (await axios.post(UNZIP, JSON.parse(file.location),{
        headers: {
            Authorization:`Bearer ${accessToken}`
        }
    })).data;
    niis.forEach((value)=>{
        volumes.push({
            //URL is for NiiVue blob loading
            url: value.link,
            //name is for NiiVue name replacer (needs proper extension like .nii)
            name: (value.filename.split('/').pop() as string),
            //alias is for user selection in toolbar
            alias: value.name
        });
    });
    return {pipelineID:job.pipeline_id, job:job,volumes:volumes};
        // Set pipeline ID
},{
        // Adding extra information to the meta field
        getPendingMeta: ({ arg, requestId }) => {
            return {
                jobId: arg.job.id, // 'arg' is your original payload
                requestId
            };
        }
});
// export const uploadROI = createAsyncThunk('PostROI', async(accessToken:string, roiFile: File)=>{
//     const config = {
//         headers: {
//             Authorization: `Bearer ${accessToken}`,
//         },
//     };
//     const response = await axios.post(ROI_UPLOAD,{
//
//     })
// });

// For local testing purposes:
let sampleResult = {
    job: sampleJob,
    pipeline_id:'###',
    volumes: [
        {
            name: 'Brain.nii',
            url: './mni.nii',
            alias: 'Brain'
        },{
            name: 'Hippocampus.nii',
            url: './hippo.nii',
            alias: 'Hippocampus',
        }]
}