/**
 * MROptimum fork of cloudmr-ux DrawToolkit.
 * Click-away exits drawing mode when you focus elsewhere (slice controls, histogram, etc.),
 * but clicks on `#niiCanvas` are ignored so you can keep drawing on the viewer.
 *
 * Layout matches {@link NiivueSlicePosition}: outer wrapper → `.title` → `Card` + `CardContent` (no custom fill).
 */
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DrawIcon from "@mui/icons-material/Draw";
import CropSquareOutlinedIcon from "@mui/icons-material/CropSquareOutlined";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import AutoFixNormalOutlinedIcon from "@mui/icons-material/AutoFixNormalOutlined";
import ReplyIcon from "@mui/icons-material/Reply";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SvgIcon from "@mui/material/SvgIcon";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import OpacityIcon from "@mui/icons-material/Opacity";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import DrawColorPlatte from "./DrawColorPlatte.jsx";
import EraserPlatte from "./EraserPlatte.jsx";
import MaskPlatte from "./MaskPlatte.jsx";

/** True if the event target is the main NiiVue canvas (drawing surface). Clicks there must not exit draw mode. */
function clickTargetIsNiivueCanvas(target) {
  if (typeof document === "undefined" || !(target instanceof Element)) return false;
  return !!target.closest("#niiCanvas");
}

/** Same icon tone as typical MUI on-paper controls (matches slice panel body). */
const ICON_COLOR = "#212121";

function EraserIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 25 25" sx={{ color: "inherit" }}>
      <rect x="6" y="3" width="12" height="22" rx="2" ry="2" transform="rotate(230 12 12)" fill="currentColor" />
      <rect x="7" y="4" width="10" height="8" rx="2" ry="2" transform="rotate(230 12 12)" fill="#FFFFFF" />
    </SvgIcon>
  );
}

function OpacityPlatte({ drawingOpacity, setDrawingOpacity, expanded }) {
  return (
    <Stack
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 1500,
        border: `${expanded ? "1px" : 0} solid #bbb`,
        maxWidth: expanded ? 300 : 0,
        overflow: expanded ? "visible" : "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
        width: 150,
      }}
      direction="column"
    >
      <Stack sx={{ mb: 1 }} alignItems="center">
        <Typography color="white" noWrap gutterBottom width="100%" marginLeft="10pt" fontSize="11pt" alignItems="start">
          Opacity: {drawingOpacity}
        </Typography>
        <Slider
          sx={{ width: "80%" }}
          value={drawingOpacity}
          step={0.01}
          min={0}
          max={1}
          onChange={(_e, value) => setDrawingOpacity(value)}
        />
      </Stack>
    </Stack>
  );
}

export function MroDrawToolkit(props) {
  const { drawShapeTool, onDrawShapeToolChange } = props;
  const [expandedOption, setExpandedOption] = useState("n");
  const [expandOpacityOptions, setExpandOpacityOptions] = useState(false);
  const [, setMaskColor] = useState(undefined);

  const filled = props.drawPen > 7;

  const shapeSelectedSx = (shape) =>
    drawShapeTool === shape
      ? { backgroundColor: "rgba(88, 15, 139, 0.12)", color: "#580f8b" }
      : {};

  function clickPen() {
    onDrawShapeToolChange?.("pen");
    if (expandedOption === "d") {
      setExpandedOption("n");
      props.setDrawingEnabled(false);
    } else {
      setExpandedOption("d");
      setExpandOpacityOptions(false);
      props.setDrawingEnabled(true);
    }
  }

  function clickRectangle() {
    onDrawShapeToolChange?.("rectangle");
    if (expandedOption === "r") {
      setExpandedOption("n");
      props.setDrawingEnabled(false);
    } else {
      setExpandedOption("r");
      setExpandOpacityOptions(false);
      props.setDrawingEnabled(true);
    }
  }

  function clickEllipse() {
    onDrawShapeToolChange?.("ellipse");
    if (expandedOption === "l") {
      setExpandedOption("n");
      props.setDrawingEnabled(false);
    } else {
      setExpandedOption("l");
      setExpandOpacityOptions(false);
      props.setDrawingEnabled(true);
    }
  }

  function clickEraser() {
    if (expandedOption === "e") {
      setExpandedOption("n");
    } else {
      props.updateDrawPen({ target: { value: 8 } });
      setExpandedOption("e");
    }
    props.setDrawingEnabled(expandedOption !== "e");
  }

  function clickMask() {
    if (expandedOption === "m") {
      setExpandedOption("n");
    } else {
      setExpandedOption("m");
    }
    props.setDrawingEnabled(false);
  }

  const vol = props.volumes?.[props.selectedVolume];

  const toolBtnSx = {
    color: ICON_COLOR,
    p: 0.5,
    "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
    "&.Mui-disabled": { color: "rgba(0,0,0,0.26)" },
  };

  return (
    <ClickAwayListener
      onClickAway={(event) => {
        if (clickTargetIsNiivueCanvas(event.target)) return;
        setExpandedOption("n");
        setExpandOpacityOptions(false);
        props.setDrawingEnabled(false);
        props.onExitDrawMode?.();
      }}
    >
      <div style={{ width: "100%", position: "relative", zIndex: 1080, ...props.style }}>
        <div className="title" style={{ width: "100%" }}>
          ROI Tools
        </div>
        <Card
          variant="outlined"
          sx={{
            mb: 2,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            overflow: "visible",
          }}
        >
          <CardContent sx={{ overflow: "visible" }}>
            <div style={{ display: "flex", flexDirection: "column", overflow: "visible" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 4,
                  overflow: "visible",
                }}
              >
              <Box sx={{ position: "relative", zIndex: expandedOption === "d" ? 1600 : "auto", display: "inline-flex", alignItems: "center" }}>
                <Tooltip title="Pen">
                  <IconButton aria-label="pen" size="small" onClick={clickPen} sx={{ ...toolBtnSx, ...shapeSelectedSx("pen") }}>
                    <DrawIcon sx={{ color: "inherit" }} />
                  </IconButton>
                </Tooltip>
                <DrawColorPlatte
                  expanded={expandedOption === "d"}
                  updateDrawPen={props.updateDrawPen}
                  setDrawingEnabled={props.setDrawingEnabled}
                />
              </Box>

              <Box sx={{ position: "relative", zIndex: expandedOption === "r" ? 1600 : "auto", display: "inline-flex", alignItems: "center" }}>
                <Tooltip title="Rectangle">
                  <IconButton aria-label="rectangle" size="small" onClick={clickRectangle} sx={{ ...toolBtnSx, ...shapeSelectedSx("rectangle") }}>
                    <CropSquareOutlinedIcon sx={{ color: "inherit" }} />
                  </IconButton>
                </Tooltip>
                <DrawColorPlatte
                  expanded={expandedOption === "r"}
                  updateDrawPen={props.updateDrawPen}
                  setDrawingEnabled={props.setDrawingEnabled}
                />
              </Box>

              <Box sx={{ position: "relative", zIndex: expandedOption === "l" ? 1600 : "auto", display: "inline-flex", alignItems: "center" }}>
                <Tooltip title="Ellipse">
                  <IconButton aria-label="ellipse" size="small" onClick={clickEllipse} sx={{ ...toolBtnSx, ...shapeSelectedSx("ellipse") }}>
                    <CircleOutlinedIcon sx={{ color: "inherit" }} />
                  </IconButton>
                </Tooltip>
                <DrawColorPlatte
                  expanded={expandedOption === "l"}
                  updateDrawPen={props.updateDrawPen}
                  setDrawingEnabled={props.setDrawingEnabled}
                />
              </Box>

              <Box sx={{ position: "relative", zIndex: expandedOption === "e" ? 1600 : "auto", display: "inline-flex", alignItems: "center" }}>
                <Tooltip title="Eraser">
                  <IconButton aria-label="erase" size="small" onClick={clickEraser} sx={toolBtnSx}>
                    {filled || expandedOption !== "e" ? (
                      <EraserIcon />
                    ) : (
                      <AutoFixNormalOutlinedIcon sx={{ color: ICON_COLOR }} />
                    )}
                  </IconButton>
                </Tooltip>
                <EraserPlatte
                  expandEraseOptions={expandedOption === "e"}
                  updateDrawPen={props.updateDrawPen}
                  setDrawingEnabled={props.setDrawingEnabled}
                />
              </Box>

              <Tooltip title="Undo">
                <IconButton aria-label="revert" size="small" onClick={() => props.drawUndo()} sx={toolBtnSx}>
                  <ReplyIcon sx={{ color: ICON_COLOR }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Save screenshot">
                <span>
                  <IconButton
                    aria-label="capture"
                    size="small"
                    disabled={!vol}
                    onClick={() => vol && props.nv.saveScene(`${vol.name}_drawing.png`)}
                    sx={toolBtnSx}
                  >
                    <CameraAltIcon sx={{ color: ICON_COLOR }} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Clear drawing">
                <IconButton
                  aria-label="delete"
                  size="small"
                  onClick={() => {
                    props.nv.clearDrawing();
                    props.resampleImage();
                    props.setDrawingChanged(false);
                  }}
                  sx={toolBtnSx}
                >
                  <DeleteIcon sx={{ color: ICON_COLOR }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="ROI visibility">
                <IconButton aria-label="visible" size="small" onClick={() => props.toggleROIVisible()} sx={toolBtnSx}>
                  {props.roiVisible ? (
                    <VisibilityIcon sx={{ color: ICON_COLOR }} />
                  ) : (
                    <VisibilityOffIcon sx={{ color: ICON_COLOR, opacity: 0.45 }} />
                  )}
                </IconButton>
              </Tooltip>

              <Box
                sx={{
                  position: "relative",
                  zIndex: expandOpacityOptions ? 1600 : "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  color: ICON_COLOR,
                }}
              >
                <Tooltip title="Drawing opacity">
                  <IconButton aria-label="opaque" size="small" onClick={() => setExpandOpacityOptions(!expandOpacityOptions)} sx={toolBtnSx}>
                    <OpacityIcon sx={{ color: ICON_COLOR }} />
                  </IconButton>
                </Tooltip>
                <Typography component="span" sx={{ fontSize: "0.7rem", mr: 0.25, userSelect: "none", color: ICON_COLOR }}>
                  {props.drawingOpacity.toFixed(2)}
                </Typography>
                <OpacityPlatte
                  drawingOpacity={props.drawingOpacity}
                  setDrawingOpacity={props.setDrawingOpacity}
                  expanded={expandOpacityOptions}
                />
              </Box>

              <Box sx={{ position: "relative", zIndex: expandedOption === "m" ? 1600 : "auto", display: "inline-flex", alignItems: "center" }}>
                <Tooltip title="Mask by intensity range">
                  <IconButton aria-label="fill" size="small" onClick={clickMask} sx={toolBtnSx}>
                    <FormatColorFillIcon sx={{ color: ICON_COLOR }} />
                  </IconButton>
                </Tooltip>
                <MaskPlatte
                  resampleImage={() => {
                    props.resampleImage();
                    props.setDrawingChanged(true);
                  }}
                  expanded={expandedOption === "m"}
                  nv={props.nv}
                  setMaskColor={setMaskColor}
                  unfocus={() => setExpandedOption("n")}
                />
              </Box>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClickAwayListener>
  );
}
