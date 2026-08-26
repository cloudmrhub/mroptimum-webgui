import { CmrTabs } from "cloudmr-ux";
import Home from "../home/Home";
import Setup from "../setup/Setup";
import Results from "../results/Results";
import "./Main.scss";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../features/hooks";
import { getProfile } from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";

const SETUP_TAB_INDEX = 1;

function switchToMainTab(index: number) {
  const tab = document.getElementById(`simple-tab-${index}`);
  if (tab) {
    tab.click();
    return;
  }
  const labels = ["home", "set up", "results"];
  const expected = labels[index];
  const match = Array.from(document.querySelectorAll('[role="tab"]')).find(
    (el) => el.textContent?.trim().toLowerCase() === expected,
  );
  (match as HTMLElement | undefined)?.click();
}

const HOME_TAB_ID = 1;

const Main = (props: any) => {
  const [focusedTab, setFocusedTab] = useState(HOME_TAB_ID);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  const tabData = [
    { id: 1, text: "Home", children: <Home {...props} refreshKey={homeRefreshKey} /> },
    { id: 2, text: "Set Up", children: <Setup {...props} /> },
    { id: 3, text: "Results", children: <Results {...props} /> },
  ];

  const accessToken = useAppSelector((state) => state.authenticate.accessToken);
  const pendingRetry = useAppSelector((state) => state.setup.pendingRetry);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(getProfile(accessToken));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (pendingRetry) {
      switchToMainTab(SETUP_TAB_INDEX);
    }
  }, [pendingRetry]);

  return (
    <div className="container-fluid mt-4" style={{ transition: "all 0.3s" }}>
      <CmrTabs
        tabList={tabData}
        onTabSelected={(tabIndex) => {
          setFocusedTab(tabIndex);
          if (tabIndex === HOME_TAB_ID) {
            setHomeRefreshKey((k) => k + 1);
          }
        }}
      />
    </div>
  );
};

export default Main;
