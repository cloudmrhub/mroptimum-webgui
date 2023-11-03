import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { getPipelineROI } from './roiActionCreation';
import {defaultSNR, SNR} from "../setup/setupSlice";
import {UploadedFile} from "../data/dataSlice";

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

export interface ROIState{
    rois: {[pipeline_id:string]:ROI[]};
    loading: boolean;
}

const initialState: ROIState = {
    rois:{},
    loading: true,
};

export const roiSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
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
            })
    ),
});

export const roiActions = roiSlice.actions;