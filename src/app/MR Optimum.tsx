import "./MROptimum.scss";
import "bootstrap";
import MainRouter from "./MainRouter";
import { Provider } from "react-redux";
import { store, persistor } from "../features/store";
import { PersistGate } from "redux-persist/integration/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  initializeCloudMRCore,
  createEndpoints,
  setInitialTokens,
} from "cloudmr-ux/core";
import { CLOUDMR_SERVER, API_TOKEN } from "../env";

// Initialize CloudMR Core configuration
const mrOptimumConfig = {
  APP_NAME: "MR Optimum",
  CLOUDMR_SERVER: CLOUDMR_SERVER,
  API_TOKEN: API_TOKEN,
  REQUESTS_TIMEOUT: 5000,
  FILE_CHUNK_SIZE: 10 * 1024 * 1024,
};

const endpoints = createEndpoints(mrOptimumConfig.CLOUDMR_SERVER);

initializeCloudMRCore({
  appConfig: mrOptimumConfig,
  endpoints: endpoints,
});

// Initialize authentication tokens
store.dispatch(
  setInitialTokens({
    uploadToken: mrOptimumConfig.API_TOKEN,
    queueToken: mrOptimumConfig.API_TOKEN,
  }),
);

const theme = createTheme({
  palette: {
    info: {
      main: "#580F8B",
    },
    primary: {
      main: "#580f8b",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 600,
      sm: 600,
      md: 900,
      lg: 1500, // customized
      xl: 1636,
    },
  },
});

function MrOptimum(props: any) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <div className="cmr-root">
            <MainRouter {...props} />
          </div>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default MrOptimum;
