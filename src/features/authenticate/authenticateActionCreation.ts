import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {SIGNOUT, SIGNIN, JOBS_API} from "../../Variables";
import {Job} from "../jobs/jobsSlice";
import {getUpstreamJobs} from "../jobs/jobActionCreation";

export interface SigninDataType {
    email: string;
    password: string;
}

export const getAccessToken = createAsyncThunk('SIGN_IN', async (signinData: SigninDataType) => {
    const response = await axios.post(SIGNIN, signinData);
    // console.log(response);
    // console.log(response.data);
    return Object.assign(signinData, response.data);
});

export const signOut = createAsyncThunk('SIGN_OUT', async (accessToken: string) => {
    const config = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };
    // const response = await axios.post(SIGNOUT, null, config);
    // return response.data;
    return {message:"Successfully logged out"};
});

export const webSignin = createAsyncThunk('WEB_SIGN_IN',
    async (accessToken:string, thunkAPI) => {
        //Update upstream jobs right after submission
        thunkAPI.dispatch(getUpstreamJobs(accessToken));
        //Return whether the submission was successful
        return {
            "access_token": accessToken,
            "token_type": "bearer",
            "expires_in": "1440"
        };
    });

