import { CmrTabs } from "cloudmr-ux";
import Home from "../home/Home";
import Setup from "../setup/Setup";
import Results from "../results/Results";
import "./Main.scss";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../features/hooks";
import { getProfile } from "cloudmr-ux/core/features/authenticate/authenticateActionCreation";

const Main = (props: any) => {
  const tabData = [
    { id: 1, text: "Home", children: <Home {...props} /> },
    { id: 2, text: "Set Up", children: <Setup {...props} /> },
    { id: 3, text: "Results", children: <Results {...props} /> },
  ];
  const [focusedTab, setFocusedTab] = useState(1);
  const accessToken = useAppSelector((state) => state.authenticate.accessToken);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(getProfile(accessToken));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);
  return (
    // <div className={`${focusedTab==2?'container-fluid':'container'} mt-4`} style={{maxWidth:focusedTab==2?'100%':undefined,transition: 'all 0.3s'}}>
    //     <CmrTabs tabList={tabData} onTabSelected={tabIndex => {
    //         setFocusedTab(tabIndex)
    //     }
    //     }/>
    // </div>
    <div className="container-fluid mt-4" style={{ transition: "all 0.3s" }}>
      <CmrTabs
        tabList={tabData}
        onTabSelected={(tabIndex) => {
          setFocusedTab(tabIndex);
        }}
      />
    </div>
  );
};

export default Main;
