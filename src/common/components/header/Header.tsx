import { useEffect, useState } from "react";
import "./Header.scss";
import { Link, useNavigate } from "react-router-dom";
import { Toolbar, Container } from "@mui/material";

interface MenuItem {
  path: string;
  title: string;
}

const Header = ({
  siteTitle,
  email,
  handleLogout,
  menuList,
}: {
  siteTitle: string;
  email?: string;
  // authentication: { email: string, accessToken: string }
  menuList: MenuItem[];
  handleLogout: () => void;
}) => {
  const navigate = useNavigate();
  const currPath = navigate.name;
  const [menuSelect, setMenuSelect] = useState(siteTitle);

  useEffect(() => {
    for (let item of menuList) {
      // console.log(item.path);
      // console.log(currPath);
      if (item.path === currPath) setMenuSelect(item.title);
    }
  }, [currPath, menuList]);

  const handleMenuChange = (info: MenuItem, navigate: any) => {
    if (currPath === info.path) return;
    navigate(info.path);
    for (let item of menuList) {
      if (item.path === info.path) {
        setMenuSelect(item.title);
      }
    }
    return false;
  };

  return (
    <nav
      className="navbar navbar-expand-md navbar-dark bg-dark shadow-sm"
      style={{
        background: "#390063",
        paddingTop: "10px",
        paddingBottom: "10px",
      }}
    >
      {/*add small-margin to className to align header content to the ends*/}
      <Container maxWidth="lg">
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link to="/" className="navbar-brand">
            {/* <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', display: 'inline-block' }}> */}
            <div
              style={{
                // backgroundColor: 'white',
                // borderRadius: '30%',
                width: "60px",
                height: "60px",
                marginRight: "10px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={process.env.PUBLIC_URL + "/MR Optimum_final_white.png"}
                alt="Logo"
                style={{ height: "50px", width: "50px" }}
              />{" "}
              {/* adjust height and width as needed */}
            </div>{" "}
            {/* {siteTitle} */}
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarToggleExternalContent"
            aria-controls="navbarToggleExternalContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className="collapse navbar-collapse"
            id="navbarToggleExternalContent"
          >
            {/* Left Side Of Navbar */}
            <ul className="navbar-nav">
              {(menuList || []).map((menuItem) => {
                return (
                  <li
                    className={`nav-item${menuItem.title === menuSelect ? " active" : ""}`}
                    key={menuItem.path}
                  >
                    <a
                      className="nav-link"
                      style={{ cursor: "pointer" }}
                      onClick={(event) => {
                        switch (menuItem.title) {
                          case "Bug Report":
                            window.open(
                              "https://github.com/cloudmrhub-com/mroptimum/issues",
                            );
                            // window.location.href='https://github.com/cloudmrhub-com/mroptimum/issues';
                            return;
                        }
                        event.preventDefault();
                        handleMenuChange(menuItem, navigate);
                      }}
                    >
                      {menuItem.title}
                    </a>
                  </li>
                );
              })}
            </ul>

            {/**Right Side Of Navbar **/}
            {email && (
              <ul className="navbar-nav ms-auto">
                {/** Authentication Links **/}
                <li className="nav-item dropdown">
                  <button
                    className="nav-link  dropdown-toggle"
                    type="button"
                    id="dropdownMenuButton"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    {email} <span className="caret"></span>
                  </button>
                  <ul
                    className="dropdown-menu"
                    aria-labelledby="dropdownMenuButton"
                  >
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={(event) => {
                          event.preventDefault();
                          handleLogout();
                        }}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
              </ul>
            )}
          </div>
        </Toolbar>
      </Container>
    </nav>
  );
};

export default Header;
export type { MenuItem };
