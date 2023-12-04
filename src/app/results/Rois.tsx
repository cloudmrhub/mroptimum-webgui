import CmrTable from "../../common/components/CmrTable/CmrTable";
import React, {CSSProperties, useState} from "react";
import {Button} from "@mui/material";
import {jobsSlice} from "../../features/jobs/jobsSlice";
import CMRUpload, {LambdaFile} from "../../common/components/Cmr-components/upload/Upload";
import {getUploadedData} from "../../features/data/dataActionCreation";
import {getFileExtension} from "../../common/utilities";
import {anonymizeTWIX} from "../../common/utilities/file-transformation/anonymize";
import {DATAUPLODAAPI, ROI_UPLOAD} from "../../Variables";
import {AxiosRequestConfig} from "axios";
import {useAppSelector} from "../../features/hooks";
import {nv} from "../../common/components/src/Niivue";
import {GridRowSelectionModel} from "@mui/x-data-grid";
import axios from "axios";
import Box from "@mui/material/Box";

export const ROITable = (props:{pipelineID: string,rois:any[], resampleImage:()=>void, style?: CSSProperties,nv:any})=>{
    // const rois:ROI[] = useAppSelector(state=>{
    //     return (state.roi.rois[props.pipelineID]==undefined)?[]:state.roi.rois[props.pipelineID];
    // })
    // console.log(rois);
    const [uploadKey, setUploadKey] = useState(1);
    const { accessToken } = useAppSelector((state) => state.authenticate);
    const [selectedData,setSelectedData] = useState<GridRowSelectionModel>([]);
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
            field: 'label',
            flex: 1,
        },
        {
            headerName: 'ROI Color',
            field: 'color',
            flex: 1,
            renderCell: (params:{row:any})=>{
                return <div style={{width:'14pt',height:'14pt',
                    borderRadius:'3pt',background:`${params.row.color}`}}>
                </div>
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
            field: 'visiblility',
            flex: 1,
            renderCell: (params:{row:any})=>{
                return <div>
                    {`${params.row.std.toFixed(3)}`}
                </div>
            }
        },
    ];
    return <Box style={props.style}>
        <CmrTable hideFooter={true} style={{height:'70%'}} dataSource={props.rois} columns={roiColumns}
                  columnHeaderHeight={40}
                  rowSelectionModel={selectedData} onRowSelectionModelChange={(rowSelectionModel)=>{
            setSelectedData(rowSelectionModel);
        }}/>
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
                }}
                           upload={async (file)=>{
                               const config = {
                                   headers: {
                                       Authorization: `Bearer ${accessToken}`,
                                   },
                               };
                               console.log(props);
                               const response = await axios.post(ROI_UPLOAD, {
                                   "filename": file.name,
                                   "pipeline_id": props.pipelineID,
                                   "type": "image",
                                   "contentType": "application/octet-stream"
                               }, config);
                               console.log(response);
                               axios.put(response.data.upload_url, file, {
                                   headers: {
                                       'Content-Type': "application/octet-stream"
                                   }
                               }).then(async (payload) => {
                                   await props.nv.loadDrawingFromUrl(response.data.access_url);
                                   props.resampleImage();
                               });
                               return 200;
                           }}
                           createPayload={createPayload} maxCount={1}></CMRUpload>
            </div>
        </div>
    </Box>;
}