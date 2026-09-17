import React, { useEffect } from "react";
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

const signinPageSx = {
  flex: 1,
  minHeight: 0,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  px: 1.5,
  py: 2,
  overflow: "auto",
  boxSizing: "border-box",
  "& .flex-center": {
    paddingTop: "0 !important",
    width: "auto",
    my: "auto",
    transform: "none",
  },
  "& #welcome": {
    gap: 2,
    width: "min(16rem, calc(100vw - 1.5rem))",
  },
  "& #welcome-logo img": {
    height: "clamp(40px, 7vh, 64px) !important",
  },
  "& .MuiContainer-root": {
    mt: "0 !important",
    mb: "0 !important",
  },
  "@media (min-width: 600px)": {
    px: 2,
    "& #welcome": {
      gap: 3,
      width: "min(19rem, calc(100vw - 2rem))",
    },
    "& #welcome-logo img": {
      height: "clamp(56px, 9vh, 80px) !important",
    },
  },
  "@media (min-width: 1500px)": {
    py: 4,
    "& #welcome": {
      gap: 4,
      width: "min(25rem, calc(100vw - 2rem))",
    },
    "& #welcome-logo img": {
      height: "100px !important",
    },
  },
  // Tighter vertical rhythm + smaller type on small/medium screens
  "@media (max-width: 1499px)": {
    "& .MuiTextField-root": { mt: "6px", mb: "6px" },
    "& .MuiTextField-root .MuiInputBase-root": { fontSize: "0.8rem" },
    "& .MuiTextField-root .MuiInputLabel-root": { fontSize: "0.8rem" },
    "& .MuiTextField-root .MuiInputBase-input": { py: "8px" },
    "& .MuiTypography-h6": { mb: "8px", fontSize: "0.9rem" },
    "& .MuiTypography-subtitle2": { fontSize: "0.75rem" },
    "& .MuiFormControlLabel-root": { mt: "4px", mb: "4px" },
    "& .MuiCheckbox-root": { p: "4px" },
    "& .MuiButton-contained": { mt: "10px", mb: "8px", py: "7px", fontSize: "0.8rem" },
    "& .MuiTypography-body2": { fontSize: "0.75rem" },
    "& .MuiLink-root": { fontSize: "0.75rem" },
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

  useEffect(() => {
    const root = document.querySelector(".cmr-root");
    root?.classList.toggle("cmr-root--login", isLoginPage);
    document.body.classList.toggle("cmr-login-page", isLoginPage);
    return () => {
      root?.classList.remove("cmr-root--login");
      document.body.classList.remove("cmr-login-page");
    };
  }, [isLoginPage]);

  const menuList = [
    { title: 'About', path: '/about' },
    { title: 'Cloud MR', path: 'https://cmr.cloudmrhub.com/' },
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
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "#F9F9FB",
                  boxSizing: "border-box",
                }}
              >
                <Box sx={signinPageSx}>
                  <Signin
                    appIcon={appIcon}
                    appIconHeight="clamp(56px, 9vh, 80px)"
                    appIconGap="0.5rem"
                    appIconAlign="center"
                    variant="page"
                    sx={{
                      maxWidth: { xs: 256, sm: 304, lg: 440 },
                      width: "100%",
                      mt: 0,
                      mb: 0,
                    }}
                    paperSx={{ p: { xs: 2, sm: 2.25, lg: 3 } }}
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
