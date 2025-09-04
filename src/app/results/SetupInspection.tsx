import {
    Box,
    List, ListItem, ListItemIcon, ListItemText, Typography
} from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { resultGetters } from "../../features/rois/resultSlice";
import { CmrInputNumber } from "cloudmr-ux";
import { GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { useAppSelector } from "../../features/hooks";

export const SetupInspection = () => {
    const analysisMethod = useAppSelector(resultGetters.getAnalysisMethod);
    const analysisMethodName = useAppSelector(resultGetters.getAnalysisMethodName);
    const pseudoReplicaCount = useAppSelector(resultGetters.getPseudoReplicaCount);
    const boxSize = useAppSelector(resultGetters.getBoxSize);
    const reconstructionMethod = useAppSelector(resultGetters.getReconstructionMethod);
    const flipAngleCorrection = useAppSelector(resultGetters.getFlipAngleCorrection);
    const flipAngleCorrectionFile = useAppSelector(resultGetters.getFlipAngleCorrectionFile);
    const secondaryToCoilMethodMaps = [[], ["inner"], ["inner", "innerACL"], []];
    const loadSensitivity = useAppSelector(resultGetters.getLoadSensitivity);
    const sensitivityMapSource = useAppSelector(resultGetters.getSensitivityMapSource);
    const sensitivityMapMethod = useAppSelector(resultGetters.getSensitivityMapMethod);
    const slices = useAppSelector((state) => state.result.activeJob?.slices);

    const analysisMethodMapping = [
        "Array Combining",
        "Multiple Replica",
        "Pseudo Multiple Replica",
        "Generalized Pseudo-Replica",
    ];
    const idToSecondaryOptions = ["Root Sum of Squares", "B1 Weighted", "SENSE", "GRAPPA"];
    const coilOptionAlias: { [options: string]: string } = {
        inner: "Internal Reference",
        innerACL: "Internal Reference with AutoCalibration Lines",
    };

    // (kept from your file; not used in this visual-only layout change)
    const kernelSize1 = useAppSelector(resultGetters.getKernelSize1);
    const kernelSize2 = useAppSelector(resultGetters.getKernelSize2);
    const decimateAcceleration1 = useAppSelector(resultGetters.getDecimateAcceleration1);
    const decimateAcceleration2 = useAppSelector(resultGetters.getDecimateAcceleration2);
    const decimateACL = useAppSelector(resultGetters.getDecimateACL);
    const kernelSizeRows: GridRowsProp = [
        { id: 1, type: "Kernel Size 1" },
        { id: 2, type: "Kernel Size 2" },
    ];
    const kernelSizeColumns: GridColDef[] = [
        { field: "type", headerName: "type", width: 180, editable: false },
        {
            field: "value",
            headerName: "value",
            type: "number",
            editable: false,
            align: "left",
            headerAlign: "left",
            width: 180,
            renderCell: (params) => {
                switch (params.id) {
                    case 1:
                        return <CmrInputNumber value={kernelSize1} min={1} style={{ width: "100%" }} />;
                    case 2:
                        return <CmrInputNumber value={kernelSize2} min={1} style={{ width: "100%" }} />;
                }
            },
        },
    ];
    const decimateMapping = [false, false, true, true];
    const decimateData = useAppSelector(resultGetters.getDecimate);
    const rows: GridRowsProp = [
        { id: 1, type: "Acceleration Factor 1" },
        { id: 2, type: "Acceleration Factor 2" },
        { id: 3, type: "Autocalibration Lines" },
    ];
    const columns: GridColDef[] = [
        { field: "type", headerName: "type", width: 180, editable: false },
        {
            field: "value",
            headerName: "value",
            type: "number",
            editable: false,
            align: "left",
            headerAlign: "left",
            width: 180,
            renderCell: (params) => {
                switch (params.id) {
                    case 1:
                        return <CmrInputNumber value={decimateAcceleration1} min={0} style={{ width: "100%" }} />;
                    case 2:
                        return <CmrInputNumber value={decimateAcceleration2} min={0} style={{ width: "100%" }} />;
                    case 3:
                        return (
                            <CmrInputNumber
                                value={decimateACL == null ? Number.NaN : decimateACL}
                                style={{ width: "100%" }}
                                min={0}
                                disabled={decimateACL == null}
                            />
                        );
                }
            },
        },
    ];

    const label = (text: string) => (
        <strong style={{ color: "#580F8B" }}>{text}</strong>
    );

    const Item = ({ children }: { children: React.ReactNode }) => (
        <ListItem sx={{ py: 0.25, px: 0, }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
                <ArrowRightIcon sx={{ color: "#580F8B" }} />
            </ListItemIcon>
            <ListItemText
                primary={<Typography sx={{ fontSize: 16 }}>{children}</Typography>}
            />
        </ListItem>
    );

    return (
        <Box>
            <List sx={{ py: 0 }}>
                {/* Number of Slices */}
                <Item>
                    {label("Number of Slices:")} {slices}
                </Item>

                {/* SNR Analysis Method */}
                <Item>
                    {label("SNR Analysis Method:")} {analysisMethodMapping[Number(analysisMethod)]}
                </Item>

                {/* Pseudo Replica Count (only for analysisMethod 2 or 3) */}
                {(analysisMethod == 2 || analysisMethod == 3) && (
                    <Item>
                        {label("Number of Pseudo Replica:")} {pseudoReplicaCount}
                    </Item>
                )}

                {/* Cubic VOI Size (only for analysisMethod 3) */}
                {analysisMethod == 3 && (
                    <Item>
                        {label("Cubic VOI Size (Length of Side in Pixels):")} {boxSize}
                    </Item>
                )}

                {/* Image Reconstruction Method */}
                <Item>
                    {label("Image Reconstruction Method:")}{" "}
                    {idToSecondaryOptions[Number(reconstructionMethod)]}
                </Item>

                {/* Everything depending on reconstructionMethod */}
                {reconstructionMethod != undefined && (
                    <>
                        {/* Flip Angle Correction status */}
                        <Item>
                            {label("Flip Angle Correction:")} {flipAngleCorrection ? "Using" : "Not Using"}
                        </Item>

                        {/* Flip Angle Correction file (only when used) */}
                        {flipAngleCorrection && (
                            <Item>
                                {label("Flip Angle Correction File:")}{" "}
                                {flipAngleCorrectionFile?.options.filename}
                            </Item>
                        )}

                        {/* Coil sensitivities (only for specific recon methods) */}
                        {secondaryToCoilMethodMaps[reconstructionMethod] &&
                            secondaryToCoilMethodMaps[reconstructionMethod].length != 0 && (
                                <>
                                    <Item>
                                        {label("Coil Sensitivities:")} {loadSensitivity ? "Loaded" : "Calculated"}
                                    </Item>

                                    {loadSensitivity ? (
                                        <Item>
                                            {label("Coil Sensitivity File:")} {sensitivityMapSource?.options.filename}
                                        </Item>
                                    ) : (
                                        <Item>
                                            {label("Coil Sensitivities Calculation Method:")}{" "}
                                            {sensitivityMapMethod ? coilOptionAlias[sensitivityMapMethod] : "undefined"}
                                        </Item>
                                    )}
                                </>
                            )}

                        {/* GRAPPA kernel sizes */}
                        {reconstructionMethod == 3 && (
                            <>
                                <Item>
                                    {label("Kernel Size 1:")} {kernelSize1}
                                </Item>
                                <Item>
                                    {label("Kernel Size 2:")} {kernelSize2}
                                </Item>
                            </>
                        )}

                        {/* Decimation flags */}
                        {decimateMapping[reconstructionMethod] && (
                            <Item>
                                {label("Decimate Data:")} {decimateData ? "true" : "false"}
                            </Item>
                        )}

                        {/* Decimation details */}
                        {decimateMapping[reconstructionMethod] && decimateData && (
                            <>
                                <Item>
                                    {label("Acceleration Factor 1:")} {decimateAcceleration1}
                                </Item>
                                <Item>
                                    {label("Acceleration Factor 2:")} {decimateAcceleration2}
                                </Item>
                                <Item>
                                    {decimateACL == null ? (
                                        <>
                                            {label("Autocalibration Lines:")} Used All
                                        </>
                                    ) : (
                                        <>
                                            {label("Autocalibration Lines:")} Used {decimateACL}
                                        </>
                                    )}
                                </Item>
                            </>
                        )}
                    </>
                )}
            </List>
        </Box>
    );
};
