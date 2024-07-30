import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import Box from "@mui/material/Box";
import {Alert, AlertColor, AlertTitle, Collapse, MenuItem} from "@mui/material";
import {ChangeEvent, useEffect, useRef} from "react";
import './Upload.scss';
import CmrLabel from "../label/Label";

interface UploadWindowProps {
    upload: (file: File, fileAlias: string, fileDatabase: string) => Promise<number>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    fileExtension?: string,
    template?: {
        showFileName?: boolean;
        showDatabase?: boolean;
        showFileSize?: boolean;
    };
}

export default function UploadWindow({
                                         upload, open, setOpen, fileExtension,
                                         template = {showFileName: true, showDatabase: true, showFileSize: true}, // default values
                                     }: UploadWindowProps) {
    const [fileOriginalName, setFileOriginalName] = React.useState('');
    const [fileAlias, setFileAlias] = React.useState('/');
    const [fileSize, setFileSize] = React.useState('0 MB');
    const [warningText, setWarningText] = React.useState('Unknown Status');
    const [infoOpen, setInfoOpen] = React.useState(false);
    const [locationSelection, setLocationSelection] = React.useState('s3');
    const [infoStyle, setInfoStyle] = React.useState<AlertColor>('info');
    const [uploadedFiles, setUploaded] = React.useState<File[]>([]);
    const [UpBtnDisabled, setUpBtnDisabled] = React.useState(false);
    const [UpBtnText, setUpBtnText] = React.useState('Upload');
    const [uploadBoxWarning, setUploadBoxWarning] = React.useState<undefined | string>(undefined);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const getExtension = (fileName: string | undefined) => {
        if (fileName == undefined)
            return;
        return fileName.split('.').pop();
    }

    const handleConfirm = () => {
        if (uploadedFiles.length === 0) {
            setInfoOpen(true);
            setInfoStyle('error');
            setWarningText('Must select files to upload!');
            setTimeout(() => setInfoOpen(false), 2500);
            return;
        }
        if (fileAlias.length === 0) {
            setInfoOpen(true);
            setInfoStyle('error');
            setWarningText("File name can't be empty");
            setTimeout(() => setInfoOpen(false), 2500);
            return;
        }
        setOpen(false);
        upload(uploadedFiles[0], fileAlias, locationSelection).then((response: number) => {
            console.log(response);
            //Update image with another ajax
            if (response > 0) {
                setInfoOpen(true);
                if (response === 200) {
                    setInfoStyle('success');
                    setWarningText("Upload successful");
                    setTimeout(() => {
                        setInfoOpen(false);
                        setOpen(false);
                    }, 1000);
                    setUpBtnDisabled(false);
                    setUpBtnText('Upload');
                } else if (response === 413) {
                    setInfoStyle('error');
                    setWarningText("File size limit exceeded");
                    setTimeout(() => {
                        setInfoOpen(false);
                        setUpBtnDisabled(false);
                        setUpBtnText('Upload');
                    }, 2000);
                } else if (response === 500) {
                    setInfoStyle('error');
                    setWarningText("Internal server error");
                    setTimeout(() => {
                        setInfoOpen(false);
                        setUpBtnDisabled(false);
                        setUpBtnText('Upload');
                    }, 1500);
                    setOpen(true);
                } else if (response === 400) {
                    setInfoStyle('warning');
                    setWarningText("File upload cancelled");
                    setTimeout(() => {
                        setInfoOpen(false);
                        setUpBtnDisabled(false);
                        setUpBtnText('Upload');
                    }, 1000);
                    setOpen(true);
                } else {
                    setInfoStyle('warning');
                    setWarningText("Unknown status");
                    setTimeout(() => {
                        setInfoOpen(false);
                        setUpBtnDisabled(false);
                        setUpBtnText('Upload');
                    }, 2000);
                    setOpen(true);
                }
            }
        }).catch((error) => {
            setUpBtnDisabled(false);
            setUpBtnText('Upload');
            setInfoOpen(true);
            setInfoStyle('error');
            setWarningText("Upload unsuccessful: " + error.message);
            setTimeout(() => setInfoOpen(false), 2500);
            console.error('Error:', error);
        });
        setUpBtnDisabled(true);
        setUpBtnText('Uploading');
    };

    const changeFileName = (e: ChangeEvent) => {
        // @ts-ignore
        setFileAlias(e.target.value);
    }

    function loadFiles(files: File[]) {
        if (files.length==0){
            setInfoOpen(true);
            setInfoStyle('warning');
            setWarningText('No file selected');
            setTimeout(() => setInfoOpen(false), 2500);
            return;
        }
        if (files.length > 1) {
            setInfoOpen(true);
            setInfoStyle('warning');
            setWarningText('Only accepts one file at a time');
            setTimeout(() => setInfoOpen(false), 2500);
            return;
        }
        let file = files[0];
        setUploaded([file]);
        // let reader = new FileReader();
        // reader.onload =
        function readFile(file: File) {
            setFileOriginalName(file.name);
            setFileAlias(file.name);
            const units = [
                "B",
                "KB",
                "MB",
                "GB",
                "TB",
                "PB",
                "EB",
                "ZB",
                "YB",
            ];
            let numberOfBytes = file.size;
            const exponent = Math.min(
                Math.floor(Math.log(numberOfBytes) / Math.log(1024)),
                units.length - 1
            );
            const approx = numberOfBytes / 1024 ** exponent;
            const output =
                exponent === 0
                    ? `${numberOfBytes} bytes`
                    : `${approx.toFixed(3)} ${
                        units[exponent]
                    }`;
            setFileSize(output);
        }
        readFile(file); // start reading the file data.
    }

    let initialized = false;
    let fileInput = (inputRef: HTMLElement) => {
        if (initialized)
            return;
        inputRef.addEventListener('dragover', function (e) {
            e.stopPropagation();
            e.preventDefault();
            // @ts-ignore
            if (e.dataTransfer.files) {
                // @ts-ignore
                let draggedFiles = e.dataTransfer.files;
                if (draggedFiles.length > 1) {
                    setUploadBoxWarning('Only one file can be uploaded at a time')
                } else if (fileExtension != undefined && draggedFiles.length != 0 &&
                    getExtension(draggedFiles[0].name) != fileExtension) {
                    setUploadBoxWarning(`Only accepting files with extension ${fileExtension}`);
                }
            }
            // @ts-ignore
            e.dataTransfer.dropEffect = 'copy';
        });
        // Get file data on drop
        inputRef.addEventListener('drop', function (e) {
            e.stopPropagation();
            e.preventDefault();
            setUploadBoxWarning(undefined);
            // @ts-ignore
            let files = e.dataTransfer.files; // Array of all files
            if (files.length > 1) {
                setInfoOpen(true);
                setInfoStyle('warning');
                setWarningText('Only one file can be uploaded at a time');
                setTimeout(() => setInfoOpen(false), 2500);
                return;
            } else if (fileExtension != undefined && `.${getExtension(files[0].name)}` != fileExtension) {
                setInfoOpen(true);
                setInfoStyle('warning');
                setWarningText(`Only accepting files with extension ${fileExtension}`);
                setTimeout(() => setInfoOpen(false), 2500);
                return;
            }
            // @ts-ignore
            loadFiles(files);
        });
        inputRef.addEventListener('dragleave', () => {
            setUploadBoxWarning(undefined);
        });
        initialized = true;
    };

    const fileInputClick = (e: any) => {
        const fileElem = document.getElementById("file-window");
        e.preventDefault();
        if (fileElem) {
            fileElem.click();
        }
    }

    const loadSelectedFiles = (e: ChangeEvent) => {
        e.preventDefault();
        const fileElem = document.getElementById('file-window');
        // @ts-ignore
        loadFiles(fileElem.files);
    }

    // @ts-ignore
    return (
        <div>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>File Upload</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                    </DialogContentText>
                    <DialogContent dividers>
                        <Box width={500} height={250}
                             style={{
                                 borderStyle: 'dashed',
                                 borderRadius: '5pt',
                                 borderColor: (uploadBoxWarning == undefined) ? 'lightGray' : '#BA3C3C'
                             }}>
                            <Typography component="div" style={{height: '100%'}}>
                                <Box style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '100%'
                                }}
                                     onClick={fileInputClick}
                                     ref={fileInput}>
        <Typography variant="body1" align="center" style={{marginTop: 'auto'}}>
            Drag & Drop or Click to Upload Your File Here <sup>*</sup>
        </Typography>
        <Typography variant="body2" align="center" style={{marginTop: 'auto',fontSize: '0.8rem', fontStyle:'italic'}}>
            * Only files without protected health information (PHI) can be uploaded
        </Typography>
                                    
                                </Box>
                            </Typography>
                        </Box>
                        <input
                            type="file"
                            id="file-window"
                            multiple
                            accept={fileExtension == undefined ? "*" : fileExtension}
                            style={{display: 'none'}}
                            onChange={loadSelectedFiles}
                        />
                        <Box component="form" sx={{'& .MuiTextField-root': {m: 2, width: '25ch', mb: 0}}}>
                            <div>
                                {template.showFileName && (
                                    <TextField
                                        required
                                        style={{marginTop:'30px'}}
                                        label={`File Alias:`}
                                        value={fileAlias}
                                        variant="standard"
                                        onChange={changeFileName}
                                    />
                                )}

                                {fileOriginalName!=''&&<CmrLabel style={{marginLeft:'16px', fontSize:'9pt', color:'#267833'}}>
                                    {fileOriginalName}
                                </CmrLabel>}
                                {template.showDatabase && (
                                    <TextField
                                        select
                                        label="Database:"
                                        defaultValue="s3"
                                        helperText="Upstream Storage Location"
                                        variant="standard"
                                    >
                                        {[{value: 's3', label: 'S3'}].map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            </div>
                            <div>
                                {template.showFileSize && (
                                    <TextField
                                        label="File Size:"
                                        value={fileSize}
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                        variant="standard"
                                    />
                                )}
                                <Collapse in={infoOpen}>
                                    <Alert severity={infoStyle} sx={{m: 1}}>
                                        {warningText}
                                    </Alert>
                                </Collapse>
                            </div>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button color={'inherit'} sx={{color: '#333'}} disabled={UpBtnDisabled}
                                onClick={handleClose}>Cancel</Button>
                        <Button variant='contained' disabled={UpBtnDisabled}
                                onClick={handleConfirm}>{UpBtnText}</Button>
                    </DialogActions>
                </DialogContent>
            </Dialog>
        </div>
    );
}
