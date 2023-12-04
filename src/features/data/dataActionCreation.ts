import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {DATAAPI, DATA_RENAME_API, DATA_DELETE_API, DATAUPLODAAPI} from "../../Variables";
import {UploadedFile} from "./dataSlice";
// const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// axios.defaults.httpsAgent = httpsAgent;

export const getUploadedData = createAsyncThunk('GetUploadedData', async (accessToken: string) => {
    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`}
    }
    const response = await axios.get(DATAAPI, config);
    return response.data;
});


// Here's the corresponding rename function for Data
export const renameUploadedData = createAsyncThunk('RenameUploadedData', async (arg:{accessToken: string, dataReference: UploadedFile}) => {
    const config = {
        headers: {
            Authorization: `Bearer ${arg.accessToken}`,
        },
    };
    const response = await axios.post(DATA_RENAME_API, arg.dataReference, config);
    if(response.status === 200)
        getUploadedData(arg.accessToken);
});

export const deleteUploadedData = createAsyncThunk('DeleteUploadedData', async (arg: { accessToken: string, dataId: string }) => {
    const config = {
        headers: {
            Authorization: `Bearer ${arg.accessToken}`,
        },
    };
    const response = await axios.delete(`${DATA_DELETE_API}/${arg.dataId}`, config);
    if (response.status == 200)
        getUploadedData(arg.accessToken);
});
