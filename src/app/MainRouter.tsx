import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import HeaderBar from "../common/components/header/Header";
import FooterBar from "cloudmr-ux/core/common/components/footer/Footer";
import Signin from "cloudmr-ux/core/app/signin/Signin";
import Main from "./main/Main";
import About from "./about/About";
import ContactUs from "./contact-us/ContactUs";
import BugReport from "./bug-report/BugReport";
import { useAppDispatch, useAppSelector } from "../features/hooks";
import { signOut } from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";
import WebSignin from "./WebSignin";
import { AuthenticatedHttpClient } from "cloudmr-ux/core/common/utilities/AuthenticatedRequests";
import { persistor, store } from "../features/store";
import appIcon from "../assets/cloudmr.png";
import { setupSetters } from "../features/setup/setupSlice";
import { Box } from "@mui/material";

const debugging = false;

const signinCenterSx = {
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  boxSizing: "border-box",
  "& .flex-center": {
    paddingTop: "0 !important",
    width: "auto",
    transform: "translateY(-50px)",
  },
};

const MainRouterInner = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  AuthenticatedHttpClient.setAuthenticateStateGetter(
    () => store.getState().authenticate,
  );
  const { email, logged_in_token } = useAppSelector(
    (state) => state.authenticate,
  );

  AuthenticatedHttpClient.setDispatch(dispatch);
  const debugging_or_logged_in = debugging || logged_in_token;
  const isLoginPage = location.pathname === "/login";

  const menuList = [
    { title: 'About', path: '/about' },
    // { title: 'Contact Us', path: '/contact' },
    { title: 'Bug Report', path: '/bug-report' },
  ];

  return (
    <React.Fragment>
      {debugging_or_logged_in && (
        <HeaderBar
          siteTitle="MR Optimum"
          email={email}
          menuList={menuList}
          handleLogout={() => {
            dispatch(signOut());
            dispatch(setupSetters.resetSetup());
            persistor.purge();
          }}
        />
      )}
      <Routes>
        <Route path="/websignin" element={<WebSignin />} />
        <Route path="/websignin/:token" element={<WebSignin />} />
        <Route
          path="/login"
          element={
            logged_in_token ? (
              <Navigate to="/main" />
            ) : (
              <Box
                sx={{
                  minHeight: "100vh",
                  height: "100vh",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <Box sx={signinCenterSx}>
                  <Signin
                    appIcon={appIcon}
                    appIconHeight={"100px"}
                    sx={{ maxWidth: 440, width: "100%", mt: 4, mb: 0 }}
                  />
                </Box>
                <FooterBar />
              </Box>
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
      {!isLoginPage && <FooterBar />}
    </React.Fragment>
  );
};

const MainRouter = () => {
  return (
    <BrowserRouter>
      <MainRouterInner />
    </BrowserRouter>
  );
};

export default MainRouter;
