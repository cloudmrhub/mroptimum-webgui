import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { getPipelineROI,loadResult } from './resultActionCreation';
import {defaultSNR, FileReference, SNR} from "../setup/setupSlice";
import {UploadedFile} from "../data/dataSlice";
import {Job} from "../jobs/jobsSlice";
import {RootState} from "../store";

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

export interface NiiFile {
    filename:string;
    id:number;
    dim:number;
    name:string;
    type:string;
    link:string;
}

export interface ROIState{
    rois: {[pipeline_id:string]:ROI[]};
    resultLoading: number;
    loading:boolean;
    niis:{[pipeline_id:string]:NiiFile[]};
    activeJob?: Job;
    selectedVolume: number;
    openPanel: number[];
}

const initialState: ROIState = {
    rois:{},
    niis:{'-1':[]},
    resultLoading: -1,
    loading:false,
    activeJob:undefined,
    selectedVolume:2,
    openPanel:[0]
};

export const resultSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        setPipelineID(state:ROIState,action:PayloadAction<Job>){
            state.activeJob = action.payload;
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
        builder.addCase(
            loadResult.fulfilled, (state:ROIState,action)=>{
            state.activeJob=action.payload.job;
            //@ts-ignore
            state.activeJob.setup = {alias:'-',version:'v0'};
            //@ts-ignore
            state.activeJob.setup.task = action.payload.result.headers.options;
            //@ts-ignore
            state.activeJob.logs = action.payload.result.headers.log;
            //@ts-ignore
            state.activeJob.slices = action.payload.result.info?.slices;
            state.niis[state.activeJob.pipeline_id] = action.payload.niis;
            state.selectedVolume = 1;
            state.resultLoading = -1;
        }),
        builder.addCase(
            loadResult.rejected, (state:ROIState,action)=>{
                state.resultLoading = -1;
            })
    ),
});

export const resultGetters = {
    getAnalysisMethod: (state: RootState): number | undefined => {
        return state.result.activeJob?.setup.task?.id;
    },

    getAnalysisMethodName: (state: RootState): string | undefined => {
        return state.result.activeJob?.setup.task?.name;
    },

    getPseudoReplicaCount: (state: RootState): number | undefined => {
        return state.result.activeJob?.setup.task?.options['NR'];
    },

    getBoxSize: (state: RootState): number | undefined => {
        return state.result.activeJob?.setup.task?.options['boxSize'];
    },

    getSignal: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.signal;
    },

    getNoise: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.noise;
    },

    getMultiRaid: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.signalMultiRaid;
    },

    getReconstructionMethod: (state: RootState): number | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.id;
    },

    getReconstructionMethodName: (state: RootState): string | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.name;
    },

    getFlipAngleCorrection: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.correction?.useCorrection;
    },

    getFlipAngleCorrectionFile: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.correction?.faCorrection;
    },

    getSensitivityMapMethod: (state: RootState): string | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.sensitivityMap?.options.sensitivityMapMethod;
    },

    getSensitivityMapSource: (state: RootState): FileReference | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.sensitivityMap?.options.sensitivityMapSource;
    },

    getDecimate: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.decimate;
    },

    getDecimateAcceleration1: (state: RootState): number | undefined => {
        let acc = state.result.activeJob?.setup.task?.options.reconstructor?.options.accelerations;
        return (acc) ? acc[0] : 0;
    },

    getDecimateAcceleration2: (state: RootState): number | undefined => {
        let acc = state.result.activeJob?.setup.task?.options.reconstructor?.options.accelerations;
        return (acc) ? acc[1] : 0;
    },

    getDecimateACL: (state: RootState): number | null | undefined => {
        let acl = state.result.activeJob?.setup.task?.options.reconstructor?.options.acl;
        return (acl) ? acl[0] : 0;
    },

    getKernelSize1: (state: RootState): number | undefined => {
        let ks = state.result.activeJob?.setup.task?.options.reconstructor?.options.kernelSize;
        return (ks) ? ks[0] : 0;
    },

    getKernelSize2: (state: RootState): number | undefined => {
        let ks = state.result.activeJob?.setup.task?.options.reconstructor?.options.kernelSize;
        return (ks) ? ks[1] : 0;
    },

    getLoadSensitivity: (state: RootState): boolean | undefined => {
        return state.result.activeJob?.setup.task?.options.reconstructor?.options.sensitivityMap?.options.loadSensitivity;
    },
};

export const resultActions = resultSlice.actions;