import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import{SIGNOUT, SIGNIN} from "../../Variables";

export interface SigninDataType {
    email: string;
    password: string;
}

export const getAccessToken = createAsyncThunk('SIGN_IN', async (signinData: SigninDataType) => {
    const response = await axios.post(SIGNIN, signinData);
    console.log(response);
    return Object.assign(signinData, response.data);
});

export const signOut = createAsyncThunk('SIGN_OUT', async (accessToken: string) => {
    const config = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };
    const response = await axios.post(SIGNOUT, null, config);
    return response.data;
});
