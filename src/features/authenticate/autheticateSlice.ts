import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {getAccessToken, getFineGrainToken, getProfile, signOut, webSignin} from './authenticateActionCreation';
import {RootState} from "../store";
import {getUploadedData} from "../data/dataActionCreation";
import {UploadedFile} from "../data/dataSlice";
import {API_TOKEN} from "../../env";


interface AuthenticateState {
    id?:string;
    email: string;
    username?:string;
    status?:string;
    level?:string;

    password: string;

    accessToken: string;
    tokenType: string;
    expiresIn: string;
    loading: boolean;

    // Tokens providing fine-grained access
    uploadToken: string;
    queueToken: string;
}

const initialState: AuthenticateState = {
    email: '',
    password: '',
    accessToken: '',
    tokenType: '',
    expiresIn: '',
    loading: true,
    uploadToken: API_TOKEN,
    queueToken: API_TOKEN,
};

export const authenticateSlice = createSlice({
    name: 'authenticate',
    initialState,
    reducers: {},
    extraReducers: (builder) => (
        builder.addCase('persist/REHYDRATE', (state, action) => {
            let authenticate = (<PayloadAction<RootState>> action).payload?.authenticate;
            // When rehydrating, only take the accessToken from the persisted state
            if (authenticate) {
                state.email = authenticate.email;
                state.accessToken = authenticate.accessToken;
                //@TODO: if remember password, hydrate pass word here
            }
        }),
        builder.addCase(getAccessToken.pending, (state, action) => {
            state.loading = true;
        }),
        builder.addCase(getAccessToken.fulfilled, (state, action) => {
            const { email, password, access_token, token_type, expires_in,level } = action.payload;
            state.email = email;
            state.password = password;
            state.accessToken = access_token;
            state.tokenType = token_type;
            state.expiresIn = expires_in;
            state.loading = false;
        }),
        builder.addCase(getFineGrainToken.fulfilled, (state,action)=>{
            if(action.payload==undefined)
               return;
           const [queue, upload] = action.payload.activities;
           state.queueToken = queue;
           state.uploadToken = upload;
        }),
        builder.addCase(signOut.pending, (state, action) => {
            state.loading = true;
        }),
        builder.addCase(signOut.fulfilled, (state, action) => {
            const { message } = action.payload;
            if (message === "Successfully logged out") {
                state.accessToken = "";
                state.email = "";
                state.expiresIn = "";
                state.password = "";
                state.tokenType = "";
                state.loading = false;
            }
        }),
        builder.addCase(webSignin.pending,(state, action) => {
            state.loading = true;
        }),
        builder.addCase(webSignin.fulfilled,(state, action) => {
            state.accessToken = action.payload.access_token;
        }),
        builder.addCase(getUploadedData.pending, (state, action) => {
            state.loading = true;
        }),
        builder.addCase(getUploadedData.fulfilled, (state, action) => {
            let data: Array<UploadedFile> = [];
            const payloadData: any = action.payload;
            if (payloadData == undefined||payloadData.error=='user not recognized') {
                state.accessToken = "";
                state.expiresIn = "";
                state.password = "";
                state.tokenType = "";
                state.loading = false;
            }
            state.loading = false;
        }),
        builder.addCase(getProfile.fulfilled, (state, action) => {
            let data: Array<UploadedFile> = [];
            const payloadData: any = action.payload;
            if (payloadData == undefined||payloadData.error=='user not recognized') {
                state.accessToken = "";
                state.expiresIn = "";
                state.password = "";
                state.tokenType = "";
                state.loading = false;
                state.uploadToken = API_TOKEN;
                state.queueToken = API_TOKEN;
            }else{
                state.email = payloadData.email;
                state.level = payloadData.level;
                state.status = payloadData.status;
                state.username = payloadData.username;
            }
            state.loading = false;
        })
    ),
});