import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../features/hooks";
import { webSignin } from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";

export default function WebSignin() {
  const dispatch = useAppDispatch();
  const { logged_in_token } = useAppSelector((state) => state.authenticate);
  const { token: tokenParam } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = tokenParam || searchParams.get("token") || undefined;

  console.log("[WebSignin] render | tokenParam:", tokenParam, "| queryToken:", searchParams.get("token"), "| logged_in_token:", !!logged_in_token);

  useEffect(() => {
    console.log("[WebSignin] useEffect | token:", token ? token.slice(0, 20) + "…" : "MISSING");
    if (token) {
      dispatch(webSignin(token)).then((result: any) => {
        console.log("[WebSignin] webSignin dispatched, result:", result?.type, "| payload access_token present:", !!result?.payload?.access_token);
      });
    }
  }, [dispatch, token]);

  if (logged_in_token) {
    console.log("[WebSignin] logged_in_token is SET → navigating to /main");
    return <Navigate to="/main" replace />;
  }

  if (!token) {
    console.log("[WebSignin] no token → navigating to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("[WebSignin] waiting for dispatch to complete…");
  return null;
}
