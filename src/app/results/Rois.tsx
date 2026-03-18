import { CmrTable } from "cloudmr-ux";
import { CSSProperties, useState } from "react";
import { Tooltip, IconButton, Snackbar, Alert } from "@mui/material";
import { CMRUpload, LambdaFile } from "cloudmr-ux";
import { useAppDispatch, useAppSelector } from "../../features/hooks";
import { GridRowSelectionModel, GridValueSetterParams } from "@mui/x-data-grid";
import axios, { AxiosRequestConfig } from "axios";
import Box from "@mui/material/Box";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
} from "@fortawesome/free-solid-svg-icons";
import { Icon as WpIcon, group as wpGroup, ungroup as wpUngroup, download as wpDownload, trash as wpTrash } from "@wordpress/icons";
import { getPipelineROI } from "cloudmr-ux/core";
import { AuthenticatedHttpClient } from "cloudmr-ux/core";
import { getEndpoints } from "cloudmr-ux/core";
export const ROITable = (props: {
  pipelineID: string;
  rois: any[];
  resampleImage: () => void;
  zipAndSendROI: (url: string, filename: string, blob: Blob) => Promise<void>;
  unpackROI: (url: string) => Promise<void>;
  setLabelAlias: (label: number | string, alias: string) => void;
  style?: CSSProperties;
  nv: any;
}) => {
  // const rois:ROI[] = useAppSelector(state=>{
  //     return (state.roi.rois[props.pipelineID]==undefined)?[]:state.roi.rois[props.pipelineID];
  // })
  // console.log(rois);
  const [uploadKey, setUploadKey] = useState(1);
  const { accessToken } = useAppSelector((state) => state.authenticate);
  const pipeline = useAppSelector(
    (state) => state.result.activeJob?.pipeline_id,
  );
  const [selectedData, setSelectedData] = useState<GridRowSelectionModel>([]);
  const dispatch = useAppDispatch();
  const endpoints = getEndpoints();
  const roiColumns = [
    {
      headerName: "ROI Label",
      field: "alias",
      flex: 1,
      editable: true,
      valueSetter: (params: GridValueSetterParams) => {
        let value = params.value;
        // console.log(params);
        const newAlias = params.value; // Value entered by the user
        // console.log(newAlias);
        if (newAlias !== params.row.alias) {
          props.setLabelAlias(params.row.label, newAlias);
        }
        return params.row;
      },
    },
    {
      headerName: "Color",
      field: "color",
      flex: 0.5,
      sortable: false,
      // renderHeader: (params: any) => {
      //     return (
      //         <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      //             {params.colDef.headerName}
      //         </Box>
      //     );
      // },
      renderCell: (params: { row: any }) => {
        return (
          <Box
            sx={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <div
              style={{
                width: "14pt",
                height: "14pt",
                borderRadius: "3pt",
                background: `${params.row.color}`,
              }}
            ></div>
          </Box>
        );
      },
    },
    {
      headerName: "Mean",
      field: "mu",
      flex: 1,
      renderCell: (params: { row: any }) => {
        return <div>{`${params.row.mu.toFixed(3)}`}</div>;
      },
    },
    {
      headerName: "SD",
      field: "std",
      flex: 1,
      renderCell: (params: { row: any }) => {
        return <div>{`${params.row.std.toFixed(3)}`}</div>;
      },
    },
    {
      headerName: "Visibility",
      field: "visibility",
      flex: 1,
      sortable: false,
      // renderHeader: (params: any) => {
      //     return (
      //         <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      //             {params.colDef.headerName}
      //         </Box>
      //     );
      // },
      renderCell: (params: { row: any }) => {
        return (
          <Box
            sx={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <IconButton
              onClick={(event) => {
                props.nv.setLabelVisibility(
                  Number(params.row.label),
                  !props.nv.getLabelVisibility(Number(params.row.label)),
                );
                props.resampleImage();
                props.nv.drawScene();
                event.stopPropagation();
              }}
            >
              {params.row.visibility ? (
                <VisibilityIcon sx={{ color: "#aaa" }} />
              ) : (
                <VisibilityOffIcon sx={{ color: "#aaa" }} />
              )}
            </IconButton>
          </Box>
        );
      },
    },
    {
      headerName: "Voxel Count",
      field: "count",
      flex: 1.5,
    },
  ];

  const [warningVisible, setWarningVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const warnEmptySelection = function (message: string) {
    setWarningMessage(message);
    setWarningVisible(true);
  };
  return (
    <Box style={props.style}>
      <CmrTable
        // sx={{
        //     borderBottomLeftRadius: 0,
        //     borderBottomRightRadius: 0,
        //     marginBottom: 0,
        //     paddingBottom: 0,
        // }}
        hideFooter={true}
        getRowId={(row) => row.label}
        style={{ height: "70%" }}
        dataSource={props.rois}
        columns={roiColumns}
        columnHeaderHeight={40}
        rowSelectionModel={selectedData}
        onRowSelectionModelChange={(rowSelectionModel) => {
          setSelectedData(rowSelectionModel);
        }}
        // processRowUpdate={(newRow, oldRow) => {
        //     console.log(newRow);
        //     console.log(oldRow);
        //     if(oldRow.alias !== newRow.alias) {
        //         const newAlias = newRow.alias; // Value entered by the user
        //         console.log(newAlias);
        //         const cellLabel = newRow.label; // Assuming the label is stored in params.id
        //         props.setLabelAlias(cellLabel, newAlias);
        //     }
        //     return true;
        // }}
      />

      {/*Toolbar: Group, Ungroup, Download, Delete, Upload */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mt: 0,
          px: 2,
          py: 1,
          backgroundColor: "#f8f9fa",
          border: "1px solid rgba(0, 0, 0, 0.12)",
          borderTop: "none",
          borderRadius: "0 0 4px 4px",
        }}
      >
        <Tooltip title="Group selected ROIs">
          <IconButton
            onClick={() => {
              if (selectedData.length === 0) {
                warnEmptySelection("Please select an ROI to group");
                return;
              }
              props.nv.groupLabelsInto(
                selectedData.map((value) => Number(value)),
              );
              props.nv.drawScene();
              props.resampleImage();
            }}
          >
            <WpIcon icon={wpGroup} size={24} style={{ color: "#9e9e9e" }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Ungroup ROIs">
          <IconButton
            onClick={() => {
              if (selectedData.length === 0) {
                warnEmptySelection("Please select an ROI to ungroup");
                return;
              }
              props.nv.ungroup();
              props.nv.drawScene();
              props.resampleImage();
            }}
          >
            <WpIcon icon={wpUngroup} size={24} style={{ color: "#9e9e9e" }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Download">
          <IconButton
            onClick={async () => {
              let fileName = "label";
              let selectedLabels = [];
              for (let label of selectedData) {
                fileName += label;
                selectedLabels.push(Number(label));
              }
              fileName += ".nii";
              if (selectedLabels.length === 0) {
                warnEmptySelection("Please select an ROI to download");
                return;
              }
              await props.nv.saveImageByLabels(fileName, selectedLabels);
            }}
          >
            <WpIcon icon={wpDownload} size={24} style={{ color: "#9e9e9e" }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete">
          <IconButton
            onClick={() => {
              if (selectedData.length === 0) {
                warnEmptySelection("Please select an ROI to delete");
                return;
              }
              props.nv.deleteDrawingByLabel(
                selectedData.map((value) => Number(value)),
              );
              props.resampleImage();
              props.nv.drawScene();
            }}
          >
            <WpIcon icon={wpTrash} size={24} style={{ color: "#9e9e9e" }} />
          </IconButton>
        </Tooltip>

        {/* Keep Upload Button the Same, Embedded in Toolbar */}
        <CMRUpload
          changeNameAfterUpload={false}
          color="primary"
          key={uploadKey}
          onUploaded={(res, file) => {}}
          uploadHandler={async (file) => {
            const config = {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            };
            console.log(props);
            let filename = file.name;
            filename.split(".").pop();
            const response = await AuthenticatedHttpClient.post(
              endpoints.ROI_UPLOAD,
              {
                filename: filename,
                pipeline_id: props.pipelineID,
                type: "image",
                contentType: "application/octet-stream",
              },
              config,
            );
            console.log(response);
            await props
              .zipAndSendROI(response.data.upload_url, filename, file)
              .then(async () => {
                await props.unpackROI(response.data.access_url);
                // @ts-ignore
                dispatch(getPipelineROI({ accessToken, pipeline }));
              });
            return 200;
          }}
          maxCount={1}
        ></CMRUpload>
      </Box>
      <Snackbar
        open={warningVisible}
        autoHideDuration={3000}
        onClose={() => setWarningVisible(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          sx={{ width: "100%" }}
          onClose={() => setWarningVisible(false)}
        >
          {warningMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
