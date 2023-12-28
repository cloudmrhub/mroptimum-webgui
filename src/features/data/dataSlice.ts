import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {deleteUploadedData, getUploadedData, renameUploadedData} from './dataActionCreation';
import {convertTimestamp} from "../../common/utilities/CalendarHelper";

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
    renamingPending?: boolean;
    deletionPending?: boolean;
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
                        link: element.link,
                        md5: element.md5,
                        size: element.size,
                        status: (element.status=='notavailable')?'not available':element.status,
                        createdAt: convertTimestamp(element.created_at),
                        updatedAt: convertTimestamp(element.updated_at),
                        database: element.database,
                        location: element.location,
                        renamingPending: false
                    });
                });
            }

            state.files = data;
            state.loading = false;
        }),
        builder.addCase(renameUploadedData.pending,(state:DataState,action)=>{
            let id = action.meta.arg.fileId;
            for(let file of state.files){
                if(file.id==id){
                    file.renamingPending=true;
                }
            }
        }),
            builder.addCase(renameUploadedData.fulfilled,(state:DataState,action)=>{
                let id = action.meta.arg.fileId;
                for(let file of state.files){
                    if(file.id==id){
                        delete file.renamingPending;
                    }
                }
            }),
            builder.addCase(deleteUploadedData.pending,(state:DataState,action)=>{
                let id = action.meta.arg.fileId;
                for(let file of state.files){
                    if(file.id==id){
                        file.deletionPending=true;
                    }
                }
            }),
            builder.addCase(deleteUploadedData.fulfilled,(state:DataState,action)=>{
                let id = action.meta.arg.fileId;
                for(let file of state.files){
                    if(file.id==id){
                        delete file.deletionPending;
                    }
                }
            })
    ),
});