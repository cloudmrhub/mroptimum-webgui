import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import { authenticateSlice } from "cloudmr-ux/core/features/authenticate/authenticateSlice";
import { dataSlice } from "cloudmr-ux/core/features/data/dataSlice";
import { jobsSlice } from "cloudmr-ux/core/features/jobs/jobsSlice";
import { resultSlice } from "cloudmr-ux/core/features/rois/resultSlice";
import { setupSlice } from "./setup/setupSlice";
import storage from "redux-persist/lib/storage";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

let rootReducer = combineReducers({
  authenticate: authenticateSlice.reducer,
  data: dataSlice.reducer,
  jobs: jobsSlice.reducer,
  setup: setupSlice.reducer,
  result: resultSlice.reducer,
});

const persistConfig = {
  whitelist: ["authenticate", "setup", "home", "pipeline"],
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
// persistor.purge();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default persistedReducer;
