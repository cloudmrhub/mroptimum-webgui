import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import{SIGNOUT, SIGNIN} from "../../Variables";

export interface SigninDataType {
    email: string;
    password: string;
}

export const getAccessToken = createAsyncThunk('SIGN_IN', async (signinData: SigninDataType) => {
    // const response = await axios.post(SIGNIN, signinData);
    // console.log(response);
    // console.log(response.data);
    //@ts-ignore
    const data = window.Credentials? window.Credentials:{
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9jYW5jZWxpdC1lbnYuZWJhLXBtYW1jdXY1LnVzLWVhc3QtMS5lbGFzdGljYmVhbnN0YWxrLmNvbVwvYXBpXC9hdXRoXC9sb2dpbiIsImlhdCI6MTY5NzQ0ODIzMywiZXhwIjoxNjk3NTM0NjMzLCJuYmYiOjE2OTc0NDgyMzMsImp0aSI6IjU0VXVwSExLcEc5STdPYXIiLCJzdWIiOjk5OTksInBydiI6Ijg3ZTBhZjFlZjlmZDE1ODEyZmRlYzk3MTUzYTE0ZTBiMDQ3NTQ2YWEifQ.b1i4ASZl9uQsMfOpxOp1IHWoSCFm051BUuLLGfqy2PE",
        "token_type": "bearer",
        "expires_in": "1440"
    };
    return Object.assign(signinData, data);
});

export const signOut = createAsyncThunk('SIGN_OUT', async (accessToken: string) => {
    const config = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };
    // const response = await axios.post(SIGNOUT, null, config);
    // return response.data;
    return {message:"Successfully logged out"};
});
