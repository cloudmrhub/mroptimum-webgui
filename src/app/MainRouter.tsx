import React from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import HeaderBar from '../common/components/header/Header';
import FooterBar from 'cloudmr-core/common/components/footer/Footer';
import Signin from './signin/Signin';
import Main from './main/Main';
import About from './about/About';
import ContactUs from './contact-us/ContactUs';
import BugReport from './bug-report/BugReport';
import {useAppDispatch, useAppSelector} from "../features/hooks";
import {getLoggedInToken} from "cloudmr-core/features/authenticate/authenticateActionCreation"
import WebSignin from "./WebSignin";
import { AuthenticatedHttpClient } from 'cloudmr-core/common/utilities/AuthenticatedRequests';
import { store } from '../features/store';

const debugging = false;

const MainRouter = () => {
    const authenticate = useAppSelector((state) => state.authenticate);
    const dispatch = useAppDispatch();
    AuthenticatedHttpClient.setAuthenticateStateGetter(() => store.getState().authenticate);
    AuthenticatedHttpClient.setDispatch(dispatch);

    return (<React.Fragment>
        <BrowserRouter>
            {(debugging||authenticate.accessToken) &&
                <HeaderBar siteTitle="CloudMR" authentication={authenticate} menuList={[]} handleLogout={()=>{}}/>}
        <Routes>
            <Route path="/websignin/:token" element={<WebSignin/>}/>
            <Route path="/login" element={(authenticate.accessToken)?<Navigate to='/main'/>:<Signin
                //@ts-ignore
                signInCallback={(credentials)=>dispatch(getLoggedInToken(credentials))}/>} />
            <Route
                path="/"
                element={debugging||authenticate.accessToken ? (<Navigate to='/main'/>) : (<Navigate to='/login'/>)}/>
            <Route
                path="/main"
                element={debugging||authenticate.accessToken ? (<Main/>) : (<Navigate to='/login'/>)}/>
            <Route
                path="/about"
                element={debugging||authenticate.accessToken ? (<About/>) : (<Navigate to='/login'/>)}/>
            <Route
                path="/contact"
                element={debugging||authenticate.accessToken ? (
                    <ContactUs/>) : (<Navigate to='/login'/>)}/>
            <Route
                path="/bug-report"
                element={debugging||authenticate.accessToken ? (<BugReport/>) : (<Navigate to='/login'/>)}/>
        </Routes>
        <FooterBar/>
        </BrowserRouter>
    </React.Fragment>
);
};

export default MainRouter;
