import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import HeaderBar from "../common/components/header/Header";
import FooterBar from "cloudmr-ux/core/common/components/footer/Footer";
import Signin from "cloudmr-ux/core/app/signin/Signin";
import Main from "./main/Main";
import About from "./about/About";
import ContactUs from "./contact-us/ContactUs";
import BugReport from "./bug-report/BugReport";
import { useAppDispatch, useAppSelector } from "../features/hooks";
import { getLoggedInToken, signOut } from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";
import WebSignin from "./WebSignin";
import { AuthenticatedHttpClient } from "cloudmr-ux/core/common/utilities/AuthenticatedRequests";
import { persistor, store } from "../features/store";
import appIcon from "../assets/mrOptimum.png";
import { setupSetters } from "../features/setup/setupSlice";

const debugging = false;

const MainRouter = () => {
  const dispatch = useAppDispatch();
  AuthenticatedHttpClient.setAuthenticateStateGetter(
    () => store.getState().authenticate,
  );
  const { email, logged_in_token } = useAppSelector(
    (state) => state.authenticate,
  );

  AuthenticatedHttpClient.setDispatch(dispatch);
  const debugging_or_logged_in = debugging || logged_in_token;

  return (
    <React.Fragment>
      <BrowserRouter>
        {debugging_or_logged_in && (
          <HeaderBar
            siteTitle="MR Optimum"
            email={email}
            menuList={[]}
            handleLogout={() => {
              dispatch(signOut());
              dispatch(setupSetters.resetSetup());
              persistor.purge();
            }}
          />
        )}
        <Routes>
          <Route path="/websignin/:token" element={<WebSignin />} />
          <Route
            path="/login"
            element={
              logged_in_token ? (
                <Navigate to="/main" />
              ) : (
                <Signin
                  //@ts-ignore
                  signInCallback={(credentials) =>
                    dispatch(getLoggedInToken(credentials))
                  }
                  appIcon={appIcon}
                  appTitle="Optimum"
                />
              )
            }
          />
          <Route
            path="/"
            element={
              debugging_or_logged_in ? (
                <Navigate to="/main" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/main"
            element={
              debugging_or_logged_in ? <Main /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/about"
            element={
              debugging_or_logged_in ? <About /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/contact"
            element={
              debugging_or_logged_in ? <ContactUs /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/bug-report"
            element={
              debugging_or_logged_in ? <BugReport /> : <Navigate to="/login" />
            }
          />
        </Routes>
        <FooterBar />
      </BrowserRouter>
    </React.Fragment>
  );
};

export default MainRouter;
