import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { getUploadedData } from './dataActionCreation';

// {
//     "type": "s3",
//     "filename": "noise.dat",
//     "key": "noise.dat",
//     "bucket": "mytestcmr",
//     "options": {},
//     "multiraid": false,
//     "vendor": "Siemens"
// }
export interface UploadedFile {
    id: number;
    fileName: string;
    link: string;
    md5?: string;
    size: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    //One of local or s3
    database: string;
    location: string;
}

interface DataState {
    files: Array<UploadedFile>;
    loading: boolean;
}

const initialState: DataState = {
    files: [],
    loading: true,
};

export const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        /**
         * Delete job referenced by its index
         * @param state
         * @param action
         */
        renameData(state: DataState, action: PayloadAction<{ index:number, alias:string}>){
            state.files[action.payload.index].fileName = action.payload.alias;
        },
        deleteData(state: DataState, action: PayloadAction<{index: number}>){
            state.files.splice(action.payload.index,1);
        }},
    extraReducers: (builder) => (
        builder.addCase(getUploadedData.pending, (state, action) => {
            state.loading = true;
        }),
        builder.addCase(getUploadedData.fulfilled, (state, action) => {
            let data: Array<UploadedFile> = [];
            const payloadData: Array<any> = action.payload;
            if(payloadData==undefined)
                return;
            if (payloadData.length > 0) {
                payloadData.forEach((element) => {
                    data.push({
                        id: element.id,
                        fileName: element.filename,
                        link: element.location,
                        md5: element.md5,
                        size: element.size,
                        status: element.status,
                        createdAt: element.created_at,
                        updatedAt: element.updated_at,
                        database: element.database,
                        location: element.location
                    });
                });
            }

            state.files = data;
            state.loading = false;
        })
    ),
});