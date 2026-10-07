import { useCallback } from "react";
import {
  refreshAccessToken,
  signOut,
} from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";
import { useAppDispatch, useAppSelector } from "../features/hooks";
import { persistor } from "../features/store";

export const CLOUDMR_HUB_ORIGIN = "https://cmr.cloudmrhub.com";

const REFRESH_SKEW_SECONDS = 60 * 15;

const appLoginUrl = (base: string) => `${base}/login`;
const appSigninUrl = (base: string, token: string) =>
  `${base}/websignin?token=${encodeURIComponent(token)}`;

function tokenNeedsRefresh(loggedInToken: {
  parsedToken?: { exp?: number };
}) {
  const exp = loggedInToken?.parsedToken?.exp;
  if (!exp) return true;
  return exp - Math.floor(Date.now() / 1000) < REFRESH_SKEW_SECONDS;
}

function openOrNavigate(win: Window | null, url: string) {
  if (win && !win.closed) {
    win.location.href = url;
    return;
  }
  window.open(url, "_blank");
}

/**
 * Same launcher the Cloud MR site uses for MR Optimum:
 * logged in → /websignin?token=<accessToken>, otherwise /login.
 */
export default function useLaunchCloudMrHub() {
  const dispatch = useAppDispatch();
  const { accessToken, logged_in_token } = useAppSelector(
    (state) => state.authenticate,
  );

  return useCallback(async () => {
    const base = CLOUDMR_HUB_ORIGIN.replace(/\/$/, "");

    if (!logged_in_token || !accessToken) {
      window.open(appLoginUrl(base), "_blank");
      return;
    }

    if (!tokenNeedsRefresh(logged_in_token) || !logged_in_token.refreshToken) {
      window.open(appSigninUrl(base, accessToken), "_blank");
      return;
    }

    const win = window.open("about:blank", "_blank");
    try {
      const refreshed = await dispatch(
        refreshAccessToken(logged_in_token.refreshToken),
      ).unwrap();
      const token = refreshed?.accessToken || refreshed?.idToken;
      if (!token) {
        throw new Error("refresh returned no access token");
      }
      openOrNavigate(win, appSigninUrl(base, token));
    } catch (err) {
      console.error("[useLaunchCloudMrHub] token refresh failed:", err);
      dispatch(signOut());
      persistor.purge();
      openOrNavigate(win, appLoginUrl(base));
    }
  }, [accessToken, dispatch, logged_in_token]);
}
