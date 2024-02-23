import {
    Box, Button,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select
} from "@mui/material";
import {resultGetters} from "../../features/rois/resultSlice";
import CmrPanel from "../../common/components/Cmr-components/panel/Panel";
import CmrCollapse from "../../common/components/Cmr-components/collapse/Collapse";
import React, {Fragment} from "react";
import {Row} from "antd";
import CmrLabel from "../../common/components/Cmr-components/label/Label";
import CmrInputNumber from "../../common/components/Cmr-components/input-number/InputNumber";
import CmrCheckbox from "../../common/components/Cmr-components/checkbox/Checkbox";
import SelectUpload from "../../common/components/Cmr-components/select-upload/SelectUpload";
import {DataGrid, GridCellEditStopParams, GridColDef, GridRowsProp} from "@mui/x-data-grid";
import CmrButton from "../../common/components/Cmr-components/button/Button";
import {store} from "../../features/store";
import {SNRPreview} from "../setup/SetupPreviewer";
import {useAppSelector} from "../../features/hooks";

export const SetupInspection = ()=>{
    const analysisMethod = useAppSelector(resultGetters.getAnalysisMethod);
    const analysisMethodName = useAppSelector(resultGetters.getAnalysisMethodName);
    const pseudoReplicaCount = useAppSelector(resultGetters.getPseudoReplicaCount);
    const boxSize = useAppSelector(resultGetters.getBoxSize);
    const reconstructionMethod = useAppSelector(resultGetters.getReconstructionMethod);
    const flipAngleCorrection = useAppSelector(resultGetters.getFlipAngleCorrection);
    const flipAngleCorrectionFile = useAppSelector(resultGetters.getFlipAngleCorrectionFile);
    const secondaryToCoilMethodMaps = [[], ['inner'], ['inner', 'innerACL'], []];
    const loadSensitivity = useAppSelector(resultGetters.getLoadSensitivity);
    const sensitivityMapSource = useAppSelector(resultGetters.getSensitivityMapSource);
    const sensitivityMapMethod = useAppSelector(resultGetters.getSensitivityMapMethod);
    const slices = useAppSelector(state => state.result.activeJob?.slices);
    const analysisMethodMapping = [
        "Array Combining",
        "Multiple Replica",
        "Pseudo Multiple Replica",
        "Pseudo Multiple Replica Wein"
    ];

    const idToSecondaryOptions = ['Root sum of squares', 'B-1 Weighted', 'Sense', 'Grappa'];
    const coilOptionAlias: { [options: string]: string } = {
        'inner': 'Internal Reference',
        'innerACL': 'Internal Reference with AutoCalibration Lines'
    };
    const kernelSize1 = useAppSelector(resultGetters.getKernelSize1);
    const kernelSize2 = useAppSelector(resultGetters.getKernelSize2);
    const decimateAcceleration1 = useAppSelector(resultGetters.getDecimateAcceleration1);
    const decimateAcceleration2 = useAppSelector(resultGetters.getDecimateAcceleration2);
    const decimateACL = useAppSelector(resultGetters.getDecimateACL);
    const kernelSizeRows: GridRowsProp = [
        {
            id: 1,
            type: 'Kernel size 1',
        },
        {
            id: 2,
            type: 'Kernel size 2',
        }];
    const kernelSizeColumns: GridColDef[] = [
        {field: 'type', headerName: 'type', width: 180, editable: false},
        {
            field: 'value',
            headerName: 'value',
            type: 'number',
            editable: false,
            align: 'left',
            headerAlign: 'left',
            width: 180,
            renderCell: (params)=>{
                console.log(params);
                switch(params.id){
                    case 1:
                        return <CmrInputNumber value={kernelSize1}
                                               min={1}
                                               style={{width:'100%'}}></CmrInputNumber>;
                    case 2:
                        return <CmrInputNumber value={kernelSize2}
                                               min={1}
                                               style={{width:'100%'}}></CmrInputNumber>;
                }
            }
        }];
    const decimateMapping = [false, false, true, true];
    const decimateData = useAppSelector(resultGetters.getDecimate);
    const rows: GridRowsProp = [
        {
            id: 1,
            type: 'Acceleration factor 1',
        },
        {
            id: 2,
            type: 'Acceleration factor 2',
        },
        {
            id: 3,
            type: 'Autocalibration Lines',
        }];
    const columns: GridColDef[] = [
        {field: 'type', headerName: 'type', width: 180, editable: false},
        {
            field: 'value',
            headerName: 'value',
            type: 'number',
            editable: false,
            align: 'left',
            headerAlign: 'left',
            width: 180,
            renderCell: (params)=>{
                console.log(params);
                switch(params.id){
                    case 1:
                        return <CmrInputNumber value={decimateAcceleration1}
                                               min={0}
                                               style={{width:'100%'}}></CmrInputNumber>;
                    case 2:
                        return <CmrInputNumber value={decimateAcceleration2}
                                               min={0}
                                               style={{width:'100%'}}></CmrInputNumber>;
                    case 3:
                        return <CmrInputNumber value={decimateACL==null?Number.NaN:decimateACL}
                                               style={{width:'100%'}}
                                               min={0}
                                               disabled={decimateACL==null}></CmrInputNumber>;
                }
            }
        }]
    return <Box>
        <Box className={'setting-box'}>
            <span>
                {'Number of slices: '}
            </span>
            <SettingsText>
                {slices}
            </SettingsText>.
        </Box>
        <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
        <Box className={'setting-box'}>
            <span>{`SNR Analysis Method: `}</span>
            <SettingsText>
                {analysisMethodMapping[Number(analysisMethod)]}
            </SettingsText>.
        </Box>
        <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'darkgray'}}/>
        {(analysisMethod != undefined) &&
            <>
                    {(analysisMethod == 2 || analysisMethod == 3) &&
                        <SettingsBox>
                            <span>{'Number of Pseudo Replica: '}</span>
                            <SettingsText>{pseudoReplicaCount}</SettingsText>.
                        </SettingsBox>}
                    {(analysisMethod == 3) &&
                        <SettingsBox>
                            <span>{'Box Size: '}</span>
                            <SettingsText>{boxSize}</SettingsText>.
                        </SettingsBox>}
                <SettingsBox>
                    <span>{'Image Reconstruction Method: '}</span>
                    <SettingsText>{idToSecondaryOptions[Number(reconstructionMethod)]}</SettingsText>.
                </SettingsBox>
                    {(reconstructionMethod != undefined) &&
                        <Box>
                           <SettingsBox>
                               <SettingsText>
                                   {(flipAngleCorrection)?'Using ':'Not Using '}
                               </SettingsText>
                               <span>
                                   {(flipAngleCorrection)?'Flip Angle Correction,':'Flip Angle Correction.'}
                               </span>
                               {(flipAngleCorrection) &&
                                   <>
                                       Flip Angle Correction File:
                                       <SettingsText>
                                           {flipAngleCorrectionFile?.options.filename}
                                       </SettingsText>.
                                   </>
                               }
                           </SettingsBox>

                            {(secondaryToCoilMethodMaps[reconstructionMethod] && secondaryToCoilMethodMaps[reconstructionMethod].length != 0) &&
                                <SettingsBox
                                >
                                    <span>
                                        Using
                                    <SettingsText>
                                        {loadSensitivity?' Loaded ':' Calculated '}
                                    </SettingsText>
                                        {'Coil Sensitivities; '}
                                    </span>
                                    {(loadSensitivity) ?
                                        <span>
                                                    Coil Sensitvitiy File <SettingsText>{sensitivityMapSource?.options.filename}</SettingsText>
                                                </span> : <span>
                                                    Coil Sensitivities Calculation Method: <SettingsText>
                                                    {sensitivityMapMethod?coilOptionAlias[sensitivityMapMethod]:'undefined'}
                                                </SettingsText>
                                                </span>}
                                    {/*<InputLabel id="css-label">Age</InputLabel>*/}
                                </SettingsBox>}
                            {(reconstructionMethod==3) &&
                                <SettingsBox>
                                    <p style={{marginBottom:'5pt'}}>
                                        Kernel Size 1: <SettingsText>{kernelSize1}</SettingsText>
                                    </p>
                                    <p>
                                        Kernel Size 2: <SettingsText>{kernelSize2}</SettingsText>
                                    </p>
                                </SettingsBox>
                            }
                            {(decimateMapping[reconstructionMethod]) &&
                                <SettingsBox>
                                    Decimate Data:
                                    <SettingsText>
                                        {decimateData?' true.':' false.'}
                                    </SettingsText>
                                </SettingsBox>}
                            {(decimateMapping[reconstructionMethod] && decimateData) &&
                                <SettingsBox>
                                    <p style={{marginBottom:'5pt'}}>
                                        Acceleration Factor 1: <SettingsText>{decimateAcceleration1}</SettingsText>
                                        , Acceleration Factor 2: <SettingsText>{decimateAcceleration2}</SettingsText>.
                                    </p>
                                    <p>
                                        Use{decimateACL == null?
                                        <SettingsText>
                                            {' All '}
                                        </SettingsText>
                                        :<SettingsText>
                                            {decimateACL}
                                        </SettingsText>}Autocalibration Lines.
                                    </p>
                                </SettingsBox>
                            }
                        </Box>}
                </>}
    </Box>
}

const SettingsText = (props:any)=>{
    return <span style={{color:'#580F8B'}} {...props}/>
}

const SettingsBox = (props:any)=>{
    return <>
        <Box className={'setting-box'} {...props}/>
        <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
    </>
}