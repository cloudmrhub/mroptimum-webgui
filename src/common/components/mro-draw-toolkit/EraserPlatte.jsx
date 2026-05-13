import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Stack, IconButton } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";

var __assign = function () {
  __assign =
    Object.assign ||
    function (t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
  return __assign.apply(this, arguments);
};

var EraserPlatte = function (_a) {
  var expandEraseOptions = _a.expandEraseOptions,
    updateDrawPen = _a.updateDrawPen,
    setDrawingEnabled = _a.setDrawingEnabled;
  var eraseOptions = [
    _jsx(FiberManualRecordIcon, { style: { color: "white" } }, "e0"),
    _jsx(FiberManualRecordOutlinedIcon, { style: { color: "white" } }, "e1"),
  ];
  return _jsxs(
    Stack,
    __assign(
      {
        style: {
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: 1500,
          border: "".concat(expandEraseOptions ? "1px" : 0, " solid #bbb"),
          maxWidth: expandEraseOptions ? 300 : 0,
          overflow: expandEraseOptions ? "visible" : "hidden",
          borderRadius: "16px",
          borderTopLeftRadius: "6pt",
          borderTopRightRadius: "6pt",
          background: "#333",
          width: 150,
        },
        direction: "column",
      },
      {
        children: [
          _jsx(
            Stack,
            __assign(
              { direction: "row", style: { justifyContent: "center" } },
              {
                children: eraseOptions.map(function (value, index) {
                  return _jsx(
                    IconButton,
                    __assign(
                      {
                        onClick: function () {
                          updateDrawPen({ target: { value: index === 0 ? 8 : 0 } });
                          setDrawingEnabled(true);
                        },
                      },
                      { children: value }
                    ),
                    index
                  );
                }),
              }
            )
          ),
        ],
      }
    )
  );
};
export default EraserPlatte;
