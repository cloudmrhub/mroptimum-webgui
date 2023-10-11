import React from 'react';
import MainRouter from './MainRouter';
import 'bootstrap';
import {Provider} from "react-redux";
import {store,persistor} from "../features/store";
import "./MROptimum.scss";
import {PersistGate} from "redux-persist/integration/react";

function MrOptimum(props: any) {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <div className="cmr-root">
                    <MainRouter {...props} />
                </div>
            </PersistGate>
        </Provider>
    );
}

export default MrOptimum;