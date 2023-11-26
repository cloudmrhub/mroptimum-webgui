import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { getPipelineROI,loadResult } from './resultActionCreation';
import {defaultSNR, SNR} from "../setup/setupSlice";
import {UploadedFile} from "../data/dataSlice";
import {Job} from "../jobs/jobsSlice";

export interface ROI {
    id: number;
    created_at: string;
    updated_at: string;
    location: string;
    link: string;
    filename: string;
    size: null | number;
    md5: null | string;
    status: string;
    database: string;
    type: string;
    pivot: {
        pipeline_id: string;
        roi_id: string;
    };
}

export interface Volume{
    name:string;
    url:string;
    alias:string;
}
export interface ROIState{
    rois: {[pipeline_id:string]:ROI[]};
    resultLoading: number;
    loading:boolean;
    volumes:{[pipeline_id:string]:Volume[]};
    activeJob: Job;
    selectedVolume: number;
    openPanel: number[];
}

const initialState: ROIState = {
    rois:{},
    volumes:{'-1':[]},
    resultLoading: -1,
    loading:false,
    activeJob:{id:0,
        alias: 'sample0',
        status: 'completed',
        createdAt: '08-21-2023',
        updatedAt: '08-21-2023',
        pipeline_id:'-1',
        setup: {
            version: 'v0',
            alias: 'sample0',
            output:{
                coilsensitivity: false,
                gfactor: false,
                matlab: true
            },
            task: defaultSNR
        },
        files: []
    },
    selectedVolume:1,
    openPanel:[0]
};

export const resultSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        setPipelineID(state:ROIState,action:PayloadAction<Job>){
            state.activeJob = action.payload;
        },
        setOpenedVolumes(state:ROIState, action:PayloadAction<{pipelineID:string,volumes:Volume[]}>){
            state.volumes[action.payload.pipelineID] = action.payload.volumes;
        },
        selectVolume(state:ROIState,action:PayloadAction<number>){
            state.selectedVolume = action.payload;
        },
        setOpenPanel(state:ROIState,action:PayloadAction<number[]>){
            state.openPanel = action.payload;
        }
    },
    extraReducers: (builder) => (
        builder.addCase(getPipelineROI.pending, (state, action) => {
            state.loading = true;
        }),
            builder.addCase(getPipelineROI.fulfilled, (state, action) => {
                const {rois, pipeline_id}: {rois:ROI[] ,pipeline_id:string}= action.payload;
                state.rois[pipeline_id] = [];
                if (rois.length > 0) {
                    rois.forEach((element) => {
                        if(state.rois[pipeline_id]==undefined)
                            state.rois[pipeline_id] = []
                        state.rois[pipeline_id].push(element);
                    });
                }
                state.loading = false;
            }),
            builder.addCase(loadResult.pending,(state:ROIState, action) => {
                // @ts-ignore
                state.resultLoading = action.meta.jobId;
            }),
            builder.addCase(loadResult.fulfilled, (state:ROIState,action)=>{
                state.activeJob=action.payload.job;
                state.volumes[state.activeJob.pipeline_id] = action.payload.volumes;
                state.selectedVolume = 1;
                state.resultLoading = -1;
            })
    ),
});

export const resultActions = resultSlice.actions;