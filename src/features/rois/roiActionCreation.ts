import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {ROI_GET, ROI_UPLOAD} from '../../Variables';
import {ROI} from "./roiSlice";
export const getPipelineROI = createAsyncThunk('GetROI', async ({accessToken, pipeline}:{accessToken:string, pipeline:string}) => {
    const config = {
        headers: {
            Authorization:`Bearer ${accessToken}`
        },
        params: {
            pipeline_id: pipeline,
        }
    };
    console.log("executing get");
    const response = await axios.get(ROI_GET, config);
    console.log(response);
    return {rois:response.data, pipeline_id:pipeline};
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