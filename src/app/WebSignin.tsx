import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../features/hooks";
import { webSignin } from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";

export default function WebSignin() {
  const dispatch = useAppDispatch();
  const { logged_in_token } = useAppSelector((state) => state.authenticate);
  const { token: tokenParam } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  // Query param is Amplify-safe (JWT dots in the path look like a static file and 400).
  const token = tokenParam || searchParams.get("token") || undefined;

  useEffect(() => {
    if (token) {
      dispatch(webSignin(token));
    }
  }, [dispatch, token]);

  if (logged_in_token) {
    return <Navigate to="/main" replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return null;
}
