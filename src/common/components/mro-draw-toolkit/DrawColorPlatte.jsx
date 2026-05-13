/**
 * Shared ROI label color row (NiiVue pen indices 1–6). Used by pen, rectangle, and ellipse tools.
 */
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Stack, IconButton } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

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

var DrawColorPlatte = function (_a) {
  var expanded = _a.expanded,
    updateDrawPen = _a.updateDrawPen,
    setDrawingEnabled = _a.setDrawingEnabled;
  var filledOptions = [
    _jsx(FiberManualRecordIcon, { sx: { color: "red" } }, "f0"),
    _jsx(FiberManualRecordIcon, { sx: { color: "green" } }, "f1"),
    _jsx(FiberManualRecordIcon, { sx: { color: "blue" } }, "f2"),
    _jsx(FiberManualRecordIcon, { sx: { color: "yellow" } }, "f3"),
    _jsx(FiberManualRecordIcon, { sx: { color: "cyan" } }, "f4"),
    _jsx(FiberManualRecordIcon, { sx: { color: "#e81ce8" } }, "f5"),
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
          border: "".concat(expanded ? "1px" : 0, " solid #bbb"),
          maxWidth: expanded ? 300 : 0,
          overflow: expanded ? "visible" : "hidden",
          borderRadius: "16px",
          borderTopLeftRadius: "6pt",
          borderTopRightRadius: "6pt",
          background: "#333",
        },
        direction: "column",
      },
      {
        children: [
          _jsx(
            Stack,
            __assign(
              { direction: "row" },
              {
                children: filledOptions.map(function (value, index) {
                  return _jsx(
                    IconButton,
                    __assign(
                      {
                        onClick: function () {
                          updateDrawPen({ target: { value: index + 1 } });
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
export default DrawColorPlatte;
