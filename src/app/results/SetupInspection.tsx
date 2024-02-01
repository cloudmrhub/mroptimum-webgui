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
        <Box style={{width: '100%'}}>
            <span>{`SNR Analysis Method: `}</span>
            <span style={{color:'#580F8B'}}>
                {analysisMethodMapping[Number(analysisMethod)]}
            </span>
        </Box>
        <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
        {(analysisMethod != undefined) &&
            <Box>
                    {(analysisMethod == 2 || analysisMethod == 3) &&
                        <Fragment>
                            <Row style={{fontFamily: 'Roboto, Helvetica, Arial, sans-serif'}}>
                                {/*<FormControl style={{width: '100%'}} className={'mb-3'}>*/}
                                {/*<FormLabel id={'replica-count-label'}>Image Reconstruction Methods</FormLabel>*/}
                                {/*</FormControl>*/}
                                <CmrLabel style={{height: '100%', marginTop:'auto',marginBottom:'auto', color:'#000000'}}>Number of Pseudo Replica:</CmrLabel>
                                <CmrInputNumber value={pseudoReplicaCount}
                                                ></CmrInputNumber>
                            </Row>
                            <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
                        </Fragment>}
                    {(analysisMethod == 3) &&
                        <Fragment>
                            <Row style={{fontFamily: 'Roboto, Helvetica, Arial, sans-serif'}}>
                                {/*<FormControl style={{width: '100%'}} className={'mb-3'}>*/}
                                {/*<FormLabel id={'replica-count-label'}>Image Reconstruction Methods</FormLabel>*/}
                                {/*</FormControl>*/}
                                <CmrLabel style={{height: '100%', marginTop:'auto',marginBottom:'auto', color:'#000000'}}>Box Size:</CmrLabel>
                                <CmrInputNumber value={boxSize}
                                                min={2}
                                                max={20}></CmrInputNumber>
                            </Row>
                            <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
                        </Fragment>}
                    <div>
                        <span style={{color: '#000000'}}>{`Image Reconstruction Method: `}</span>
                        <span style={{color:'#580F8B'}}>
                            {idToSecondaryOptions[Number(reconstructionMethod)]}
                        </span>
                    </div>
                <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
                    {(reconstructionMethod != undefined) &&
                        <Box>
                            <CmrCheckbox className='me-2 ms-1' checked={!flipAngleCorrection}
                                         defaultChecked={!flipAngleCorrection}>
                                No Flip Angle Correction
                            </CmrCheckbox>
                            {(flipAngleCorrection) &&
                                <Button variant={"outlined"} color="info" sx={{marginRight:'10pt'}}
                                        style={{textTransform:'none'}}>
                                    {flipAngleCorrectionFile?.options.filename}
                                </Button>
                            }
                            <Divider variant="middle" sx={{marginTop: '10pt', marginBottom: '10pt', color: 'gray'}}/>
                            {(secondaryToCoilMethodMaps[reconstructionMethod] && secondaryToCoilMethodMaps[reconstructionMethod].length != 0) &&
                                <Box>
                                    <FormControl>
                                        <RadioGroup
                                            row
                                            aria-labelledby="demo-row-radio-buttons-group-label"
                                            name="row-radio-buttons-group"
                                            value={loadSensitivity}
                                        >
                                            <FormControlLabel value={true} disabled={true} control={<Radio/>}
                                                              label="Load Coil Sensitivities"/>
                                            <FormControlLabel value={false} control={<Radio/>}
                                                              label="Calculate Coil Sensitivities"/>
                                            {(loadSensitivity) ?
                                                <Button variant={"outlined"} color="info" sx={{marginRight:'10pt'}}
                                                        style={{textTransform:'none'}}>
                                                    {sensitivityMapSource?.options.filename}
                                                </Button> : <FormControl className='m-3'
                                                                         onChange={(event) => {
                                                                             //@ts-ignore
                                                                             dispatch(setupSetters.setSensitivityMapMethod(event.target.value))
                                                                         }}>
                                                    <InputLabel id="css-label">Coil sensitivities
                                                        calculation method</InputLabel>
                                                    <Select
                                                        labelId="css-label"
                                                        value={sensitivityMapMethod}
                                                        label="Coil sensitivities calculation method"
                                                        id="demo-simple-select"
                                                        sx={{width: '300pt'}}
                                                    >
                                                        {['inner', 'innerACL'].map((value, index) => {
                                                            return (secondaryToCoilMethodMaps[reconstructionMethod].indexOf(value) >= 0) ?
                                                                <MenuItem
                                                                    value={value}>{coilOptionAlias[value]}</MenuItem>
                                                                : undefined;
                                                        })}
                                                    </Select>
                                                </FormControl>}
                                            {/*<InputLabel id="css-label">Age</InputLabel>*/}
                                        </RadioGroup>
                                    </FormControl>
                                    <Divider variant="middle"
                                             sx={{color: 'gray'}}/>
                                </Box>}
                            {(reconstructionMethod==3) &&
                                <Box>
                                    <CmrLabel style={{marginLeft:'3pt', marginBottom:'15pt'}}>Kernel Size</CmrLabel>
                                    <div className='ms-3' style={{
                                        height: 'fit-content',
                                        marginRight: 'auto',
                                        marginTop: '5pt',
                                        width: '362px'
                                    }}>
                                        <DataGrid
                                            rows={kernelSizeRows}
                                            slots={{
                                                columnHeaders: () => null,
                                            }}
                                            autoHeight
                                            hideFooterPagination
                                            hideFooterSelectedRowCount
                                            hideFooter={true}
                                            columns={kernelSizeColumns}
                                            sx={{
                                                '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {display: 'none'}
                                            }}
                                            onCellEditStop={(params: GridCellEditStopParams, event) => {
                                                // console.log(params)
                                                // console.log(event)
                                                // return;
                                                //@ts-ignore
                                                if (event.target == undefined || !isNaN(event.target.value))
                                                    return;
                                            }}
                                        />
                                    </div>
                                    <Divider variant="middle" sx={{color: 'gray'}}/>
                                </Box>
                            }
                            {(decimateMapping[reconstructionMethod]) &&
                                <Fragment>
                                    <CmrCheckbox defaultChecked={decimateData}
                                                 checked={decimateData}>
                                        Decimate Data
                                    </CmrCheckbox>

                                    <Divider variant="middle"
                                             sx={{marginBottom: '15pt', color: 'gray'}}/>
                                </Fragment>}
                            {(decimateMapping[reconstructionMethod] && decimateData) &&
                                <div className='ms-3' style={{
                                    height: 'fit-content',
                                    marginRight: 'auto',
                                    marginTop: '5pt',
                                    width: '362px'
                                }}>
                                    <DataGrid
                                        rows={rows}
                                        slots={{
                                            columnHeaders: () => null,
                                        }}
                                        autoHeight
                                        hideFooterPagination
                                        hideFooterSelectedRowCount
                                        hideFooter={true}
                                        columns={columns}
                                        sx={{
                                            '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {display: 'none'}
                                        }}
                                    />
                                    <CmrCheckbox checked={decimateACL==null} style={{marginLeft:0}}>
                                        Use all autocalibration lines
                                    </CmrCheckbox>
                                </div>
                            }
                        </Box>}
                </Box>}
    </Box>
}