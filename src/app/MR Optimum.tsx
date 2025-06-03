import "./MROptimum.scss";
import React from 'react';
import 'bootstrap';
import MainRouter from './MainRouter';
import { Provider } from "react-redux";
import { store, persistor } from "../features/store";
import { PersistGate } from "redux-persist/integration/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        info: {
            main: '#580F8B'
        },
        primary: {
            main: '#580f8b',
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
                    textTransform: 'none'
                }
            }
        }
    },
    breakpoints: {
    values: {
      xs: 600,
      sm: 600,
      md: 900,
      lg: 1500, // customized
      xl: 1636,
    },
  }
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