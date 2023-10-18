import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { getUpstreamJobs } from './jobActionCreation';
import {defaultSNR, SNR} from "../setup/setupSlice";
import {UploadedFile} from "../data/dataSlice";

export interface SetupInterface{
    version:string,
    alias: string,
    output:{
        coilsensitivity: boolean,
        gfactor: boolean,
        matlab: boolean
    }
    task: SNR
}
export interface Job {
    id: number;
    alias: string;
    //One of completed, pending, or other
    status: string;
    createdAt: string;
    updatedAt: string;
    setup: SetupInterface;
    files: UploadedFile[];
}

interface JobsState {
    jobs: Array<Job>;
    loading: boolean;
}

const initialState: JobsState = {
    jobs: [{id:0,
        alias: 'sample0',
        status: 'completed',
        createdAt: '08-21-2023',
        updatedAt: '08-21-2023',
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
        files: [
            {
                id: 0,
                fileName: 'Brain',
                link: './mni152reallyreallyreallyreallyreallyLongName.nii',
                size: '',
                status: '',
                createdAt: '',
                updatedAt: '',
                //One of local or s3
                database: 's3',
                location: ''
            },{
                id: 1,
                fileName: 'Hippocampus',
                link: './hippo.nii',
                size: '',
                status: '',
                createdAt: '',
                updatedAt: '',
                //One of local or s3
                database: 's3',
                location: ''
            }]
    }],
    loading: true,
};

export const jobsSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        // submitJob(state: JobsState, action: PayloadAction<SNR>){
        //     state.jobs.push({
        //         setup:action.payload, alias: "", createdAt: "", files: [], id: 0, status: "", updatedAt: ""
        //     });
        // },
        /**
         * Delete job referenced by its index
         * @param state
         * @param action
         */
        renameJob(state: JobsState, action: PayloadAction<{ index:number, alias:string}>){
            state.jobs[action.payload.index].alias = action.payload.alias;
        },
        deleteJob(state: JobsState, action: PayloadAction<{index: number}>){
            state.jobs.splice(action.payload.index,1);
        }
    },
    extraReducers: (builder) => (
        builder.addCase(getUpstreamJobs.pending, (state, action) => {
            state.loading = true;
        }),
            builder.addCase(getUpstreamJobs.fulfilled, (state, action) => {
                let data: Array<Job> = [];
                const payloadData: Array<any> = action.payload;

                if (payloadData.length > 0) {
                    payloadData.forEach((element) => {
                        data.push(element);
                    });
                }

                state.jobs = data;
                state.loading = false;
            })
    ),
});

export const jobActions = jobsSlice.actions;