import "./MROptimum.scss";
import React from 'react';
import MainRouter from './MainRouter';
import {Provider} from "react-redux";
import {store,persistor} from "../features/store";
import {PersistGate} from "redux-persist/integration/react";
import {createTheme, ThemeProvider} from "@mui/material/styles";

const theme = createTheme({
    palette: {
        info:{
            main:'#580F8B'
        }
    },
    components:{
        MuiButton: {
            styleOverrides: {
                root:{
                    textTransform:'none'
                }
            }
        }
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