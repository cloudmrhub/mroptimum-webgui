import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { getUpstreamJobs } from './jobActionCreation';
import {defaultSNR, SNR} from "../setup/setupSlice";
import {UploadedFile} from "../data/dataSlice";

export interface Job {
    id: number;
    alias: string;
    //One of completed, pending, or other
    status: string;
    createdAt: string;
    updatedAt: string;
    setup: SNR;
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
        setup: defaultSNR,
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
            }]
    }],
    loading: true,
};

export const jobsSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        submitJob(state: JobsState, action: PayloadAction<SNR>){
            state.jobs.push({
                setup:action.payload, alias: "", createdAt: "", files: [], id: 0, status: "", updatedAt: ""
            });
        },
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
                        data.push({
                            id: element.id,
                            alias: element.alias,
                            status: element.status,
                            createdAt: element.created_at,
                            updatedAt: element.updated_at,
                            setup: JSON.parse(element.setup),
                            files: JSON.parse(element.files)
                        });
                    });
                }

                state.jobs = data;
                state.loading = false;
            })
    ),
});

export const jobActions = jobsSlice.actions;