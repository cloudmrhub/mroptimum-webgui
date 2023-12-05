import { combineReducers } from 'redux';
import {configureStore, getDefaultMiddleware} from "@reduxjs/toolkit";
import {authenticateSlice} from "./authenticate/autheticateSlice";
import {dataSlice} from "./data/dataSlice";
import {jobsSlice} from "./jobs/jobsSlice";
import {setupSlice} from "./setup/setupSlice";
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import {resultSlice} from "./rois/resultSlice";

let rootReducer = combineReducers({authenticate: authenticateSlice.reducer, data: dataSlice.reducer,
    jobs:jobsSlice.reducer, setup: setupSlice.reducer, result: resultSlice.reducer});

const persistConfig = {
    whitelist: ['authenticate', 'setup', 'home', 'pipeline'],
    key: 'root',
    storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({ reducer: persistedReducer, middleware:[
        ...getDefaultMiddleware()]});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default persistedReducer;