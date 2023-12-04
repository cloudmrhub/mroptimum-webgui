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

interface CMRSelectUploadProps extends CMRUploadProps{
    /**
     * A selection of currently uploaded files
     */
    fileSelection: UploadedFile[];
    onSelected: (file: UploadedFile)=>void;
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
    const handleClickOpen = () => {
        selectFileIndex(-1);
        setOpen(true);
    };

    const handleClose = () => {
        if(!uploading)
            setOpen(false);
    };

    const handleChange = (event: SelectChangeEvent<number>) => {
        //@ts-ignore
        selectFileIndex(event.target.value);

    };

    const onSet = ()=>{
        if(fileIndex==-1){
            return;
        }
        props.onSelected(props.fileSelection[fileIndex]);
        setOpen(false);
    }

    const selectionDialog =  <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Upload or select</DialogTitle>
        <DialogContent sx={{width: 520}}>
            <DialogContentText sx={{pl:1, pr:1, pb:0}}>
                {(uploading)?"Please wait for the upload to finish.":"Upload a new file or select from previously uploaded files:"}
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
                        <em>Select or upload a new file to proceed</em>
                    </MenuItem>
                    {((props.fileSelection!=undefined? props.fileSelection: [])).map((option,index) => (
                        <MenuItem key={index} value={index}>
                            {option.fileName}
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>
                <DialogActions sx={{pt:2}}>
                    {(!uploading)&&<Button fullWidth variant="contained"  color="success" onClick={onSet}>
                        Select
                    </Button>}
                    {fileIndex==-1&&
                        <CMRUpload  {...props} color="info"  onUploaded={(res, file)=>{
                            console.log("calling Setup level on uploaded");
                            console.log(props.onUploaded);
                            selectFileIndex(props.fileSelection.length);
                            props.onUploaded(res, file);
                            setOpen(false);
                        }} fileExtension = {props.fileExtension}
                                    uploadStarted={()=>setUploading(true)}
                                    uploadEnded={()=>setUploading(false)}
                        ></CMRUpload>}
                    <Button fullWidth variant="outlined"  color="inherit" sx={{color:'#333'}} onClick={handleClose}> Cancel</Button>
                </DialogActions>
        </DialogContent>
    </Dialog>;
    return <Fragment>
        <Button variant={(props.chosenFile==undefined)?"contained":"outlined"} color="info" onClick={handleClickOpen} sx={{marginRight:'10pt'}}
            style={{...props.style, textTransform:'none'}}>
            {(props.chosenFile==undefined)?
                (props.buttonText?props.buttonText:"Choose")
                :props.chosenFile}
        </Button>
        {selectionDialog}
    </Fragment>;
};

export default CMRSelectUpload;