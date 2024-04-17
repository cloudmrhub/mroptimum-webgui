import CmrTable from "../../common/components/CmrTable/CmrTable";
import React, {ChangeEvent, CSSProperties, useState} from "react";
import {Button} from "@mui/material";
import {jobsSlice} from "../../features/jobs/jobsSlice";
import CMRUpload, {LambdaFile} from "../../common/components/Cmr-components/upload/Upload";
import {getUploadedData} from "../../features/data/dataActionCreation";
import {getFileExtension} from "../../common/utilities";
import {anonymizeTWIX} from "../../common/utilities/file-transformation/anonymize";
import {DATAUPLODAAPI, ROI_UPLOAD} from "../../Variables";
import {AxiosRequestConfig} from "axios";
import {useAppDispatch, useAppSelector} from "../../features/hooks";
import {nv} from "../../common/components/src/Niivue";
import {GridCellEditStopParams, GridCellEditStopReasons, GridRowSelectionModel, GridValueSetterParams, MuiEvent} from "@mui/x-data-grid";
import axios from "axios";
import Box from "@mui/material/Box";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Confirmation from "../../common/components/Cmr-components/dialogue/Confirmation";
import {getPipelineROI} from "../../features/rois/resultActionCreation";

export const ROITable = (props:{pipelineID: string,
    rois:any[], resampleImage:()=>void,
    zipAndSendROI:(url:string,filename:string,blob:Blob)=>Promise<void>,
    unpackROI:(url:string)=>Promise<void>,
    setLabelAlias:(label:number|string,alias:string)=>void,
    style?: CSSProperties,nv:any})=>{
    // const rois:ROI[] = useAppSelector(state=>{
    //     return (state.roi.rois[props.pipelineID]==undefined)?[]:state.roi.rois[props.pipelineID];
    // })
    // console.log(rois);
    const [uploadKey, setUploadKey] = useState(1);
    const { accessToken } = useAppSelector((state) => state.authenticate);
    const pipeline = useAppSelector((state)=>state.result.activeJob?.pipeline_id);
    const [selectedData,setSelectedData] = useState<GridRowSelectionModel>([]);
    const dispatch = useAppDispatch();
    const UploadHeaders: AxiosRequestConfig = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
    };
    const createPayload = async (file: File, fileAlias: string) => {
        let formData = new FormData();
        if (file) {
            const lambdaFile: LambdaFile = {
                "filename": fileAlias,
                "filetype": file.type,
                "filesize": `${file.size}`,
                "filemd5": '',
                "file": file
            }
            formData.append("lambdaFile", JSON.stringify(lambdaFile));
            formData.append("file", file);
            const fileExtension = getFileExtension(file.name);

            if (fileExtension == 'dat') {
                const transformedFile = await anonymizeTWIX(file);
                file = transformedFile;
            }
            return {destination: DATAUPLODAAPI, lambdaFile: lambdaFile, file: file, config: UploadHeaders};
        }
    };
    const roiColumns=[
        {
            headerName:'ROI Label',
            field: 'alias',
            flex: 1,
            editable:true,
            valueSetter:(params: GridValueSetterParams)=>{
                let value = params.value;
                console.log(params);
                const newAlias = params.value; // Value entered by the user
                console.log(newAlias);
                if(newAlias!=params.row.alias){
                    props.setLabelAlias(params.row.label, newAlias);
                }
                return params.row
            }
        },
        {
            headerName: 'Color',
            field: 'color',
            flex: 0.5,
            sortable:false,
            renderHeader: (params:any) => {
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        {params.colDef.headerName}
                    </Box>
                );
            },
            renderCell: (params:{row:any})=>{
                return <Box sx={{width: '100%',display:'flex',justifyContent:'center'}}>
                    <div style={{width:'14pt',height:'14pt',
                        borderRadius:'3pt',background:`${params.row.color}`}}>
                    </div>
                </Box>
            }
        },
        {
            headerName: 'Mean',
            field: 'mu',
            flex: 1,
            renderCell: (params:{row:any})=>{
                return <div>
                    {`${params.row.mu.toFixed(3)}`}
                </div>
            }
        },
        {
            headerName: 'SD',
            field: 'std',
            flex: 1,
            renderCell: (params:{row:any})=>{
                return <div>
                    {`${params.row.std.toFixed(3)}`}
                </div>
            }
        },
        {
            headerName: 'Visibility',
            field: 'visibility',
            flex: 1,
            sortable:false,
            renderHeader: (params:any) => {
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        {params.colDef.headerName}
                    </Box>
                );
            },
            renderCell: (params:{row:any})=>{
                return <Box sx={{width: '100%',display:'flex',justifyContent:'center'}}>
                    <IconButton onClick={(event)=>{
                        props.nv.setLabelVisibility(Number(params.row.label),!props.nv.getLabelVisibility(Number(params.row.label)));
                        props.resampleImage();
                        props.nv.drawScene();
                        event.stopPropagation();
                    }}>
                        {params.row.visibility?<VisibilityIcon sx={{color:'#aaa'}}/>:<VisibilityOffIcon sx={{color:'#aaa'}}/>}
                    </IconButton>
                </Box>
            }
        },
        {
            headerName: 'Voxel Count',
            field: 'count',
            flex: 1.5
        },
    ];

    const [warningVisible, setWarningVisible] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const warnEmptySelection = function(message:string){
        setWarningMessage(message);
        setWarningVisible(true);
    }
    return <Box style={props.style}>
        <CmrTable hideFooter={true} getRowId={(row) => row.label} style={{height:'70%',marginBottom:10}} dataSource={props.rois} columns={roiColumns}
                  columnHeaderHeight={40}
                  rowSelectionModel={selectedData} onRowSelectionModelChange={(rowSelectionModel)=>{
            setSelectedData(rowSelectionModel);
        }}
                // processRowUpdate={(newRow, oldRow) => {
                //     console.log(newRow);
                //     console.log(oldRow);
                //     if(oldRow.alias!=newRow.alias) {
                //         const newAlias = newRow.alias; // Value entered by the user
                //         console.log(newAlias);
                //         const cellLabel = newRow.label; // Assuming the label is stored in params.id
                //         props.setLabelAlias(cellLabel, newAlias);
                //     }
                //     return true;
                // }}
        />
        <div className="row mt-2">
            <div className="col-6">
                <Button sx={{background:'#555', ":hover":{background:'#333'}}}  style={{textTransform:'none'}} variant={'contained'} fullWidth={true} onClick={()=>{
                    props.nv.groupLabelsInto(selectedData.map(value => Number(value)));
                    props.nv.drawScene();
                    props.resampleImage();
                }}>Group</Button>
            </div>
            <div className="col-6">
                <Button sx={{background:'#555', ":hover":{background:'#333'}}} style={{textTransform:'none'}} variant={'contained'} fullWidth={true} onClick={()=>{
                    props.nv.ungroup();
                    props.nv.drawScene();
                    props.resampleImage();
                }}>Ungroup</Button>
            </div>
        </div>
        <div className="row mt-2">
            <div className="col-4">
                <Button color={'success'} style={{textTransform:'none'}} variant={'contained'} fullWidth={true} onClick={async ()=>{
                    let fileName = 'label';
                    let selectedLabels = []
                    for(let label of selectedData) {
                        fileName+=label;
                        selectedLabels.push(Number(label));
                    }
                    fileName+='.nii';
                    if(selectedLabels.length==0) {
                        warnEmptySelection("No ROI selected for download");
                        return;
                    }
                    await props.nv.saveImageByLabels(fileName, selectedLabels);
                }}>Download</Button>
            </div>
            <div className="col-4">
                <Button color={'error'} style={{textTransform:'none'}} variant={'contained'} fullWidth={true} onClick={()=>{
                    props.nv.deleteDrawingByLabel(selectedData.map(value => Number(value)))
                    props.resampleImage();
                    props.nv.drawScene();
                }}>Delete</Button>
            </div>
            <div className="col-4">
                <CMRUpload color="info" key={uploadKey} onUploaded={(res, file)=>{
                }}  fullWidth
                    uploadHandler={async (file)=>{
                       const config = {
                           headers: {
                               Authorization: `Bearer ${accessToken}`,
                           },
                       };
                       console.log(props);
                       let filename = file.name;
                       filename.split('.').pop();
                       const response = await axios.post(ROI_UPLOAD, {
                           "filename": filename,
                           "pipeline_id": props.pipelineID,
                           "type": "image",
                           "contentType": "application/octet-stream"
                       }, config);
                       console.log(response);
                       await props.zipAndSendROI(response.data.upload_url,filename,file).then(async () => {
                           await props.unpackROI(response.data.access_url);
                           // @ts-ignore
                           dispatch(getPipelineROI({accessToken,pipeline}));
                       });
                       return 200;
                   }}
                   createPayload={createPayload} maxCount={1}></CMRUpload>
            </div>
        </div>
        <Confirmation name={'Warning'} message={warningMessage} color={'error'} width={400} open={warningVisible} setOpen={(open)=>setWarningVisible(open)}/>
    </Box>;
}