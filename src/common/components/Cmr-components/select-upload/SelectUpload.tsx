import React, {Fragment, useState} from "react";
import CMRUpload, {CMRUploadProps, LambdaFile} from '../upload/Upload';
import {Alert, AlertTitle, Button, Collapse, InputLabel, MenuItem} from "@mui/material";
import Select, {SelectChangeEvent} from "@mui/material/Select";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import CmrTooltip from "../tooltip/Tooltip";
import Box from "@mui/material/Box";
import {uploadData} from "../../../../features/data/dataActionCreation";
import {useAppDispatch, useAppSelector} from "../../../../features/hooks";
import {AxiosResponse} from "axios";

interface CMRSelectUploadProps extends CMRUploadProps{
    /**
     * A selection of currently uploaded files
     */
    fileSelection: UploadedFile[];
    onSelected: (file?: UploadedFile)=>void;
    chosenFile?: string;
    buttonText?: string;
    /**
     * Enforces the extension of selected files
     */
    fileExtension?:string;
}

interface UploadedFile {
    id: number;
    fileName: string;
    link: string;
    md5?: string;
    size: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    database: string;
    location: string;
}

/**
 * Select from a set of uploaded files or upload new
 */
const CMRSelectUpload = (props: CMRSelectUploadProps) => {

    let [open, setOpen] = React.useState(false);
    let [fileIndex, selectFileIndex] = React.useState(-1);
    let [uploading, setUploading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const handleClickOpen = () => {
        selectFileIndex(-1);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleChange = (event: SelectChangeEvent<number>) => {
        //@ts-ignore
        selectFileIndex(event.target.value);
    };

    const onSet = ()=>{
        props.onSelected(props.fileSelection[fileIndex]);
        setOpen(false);
    }
    const selectionDialog =  <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Select or Upload</DialogTitle>
        <DialogContent sx={{width: 520}}>
            <DialogContentText sx={{pl:1, pr:1, pb:0}}>
                {(uploading)?"Please wait for the upload to finish.":""}
            </DialogContentText>
                <DialogContent sx={{p:1}}>
                <Select
                    value={fileIndex}
                    onChange={handleChange}
                    disabled={uploading}
                    inputProps={{ 'aria-label': 'Without label' }}
                    sx={{width: '100%'}}
                >
                    <MenuItem value={-1}>
                    {props.fileSelection.length < 1 ? <em>No Stored Files</em> : <em>Select a Stored File</em>}
                    </MenuItem>
                    {((props.fileSelection!=undefined? props.fileSelection: [])).map((option,index) => (
                        <MenuItem key={index} value={index}>
                            {option.fileName}
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>
                <Box sx={{pt:2, justifyContent:'center',display:'flex', padding:'8px'}}>
                    {/* TOBEACTIVATED AFTER THE BETA TESTING */}
                    {/* {(fileIndex !== -1 && !uploading)&&<Button fullWidth sx={{marginRight:'8px'}} variant="contained"  color="success" onClick={onSet}>
                        Ok
                    </Button>}
                    {fileIndex==-1&& <CMRUpload {...props} color="info" fullWidth onUploaded={(res, file)=>{
                        console.log("calling Setup level on uploaded");
                        console.log(props.onUploaded);
                        selectFileIndex(props.fileSelection.length);
                        props.onUploaded(res, file);
                        setOpen(false);
                    }} fileExtension = {props.fileExtension}
                                                uploadHandler={props.uploadHandler}
                                                uploadStarted={()=>{
                                                    setUploading(true);
                                                    props.onSelected(undefined);
                                                }}
                                                uploadProgressed={(progress)=>{
                                                    setOpen(false);
                                                    setProgress(progress);
                                                }}
                                                uploadEnded={()=>setUploading(false)}
                    ></CMRUpload>} */}
                    <Button fullWidth variant="outlined"   color="inherit" sx={{color:'#333', marginLeft:'8px'}} onClick={handleClose}> Cancel</Button>
                </Box>
        </DialogContent>
    </Dialog>;
    return <Fragment>
        {uploading?<Button variant={"contained"} style={{...props.style, textTransform:'none'}} sx={{overflowWrap:'inherit'}} color={'primary'} disabled={uploading}>
            Uploading {progress}%
        </Button>:<Button variant={(props.chosenFile==undefined)?"contained":"outlined"} color="info" onClick={handleClickOpen} sx={{marginRight:'10pt'}}
                          style={{...props.style, textTransform:'none'}}>
            {(props.chosenFile==undefined)?
                (props.buttonText?props.buttonText:"Choose")
                :props.chosenFile}
        </Button>}
        {selectionDialog}
    </Fragment>;
};

export default CMRSelectUpload;